import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { ensureKeySet, getKeyById } from "../lib/crypto/key-manager.js";
import { openProtectedRecord, sealProtectedRecord } from "../lib/crypto/protected-record.js";

const POST_KEY_DOMAIN = "post-data";
const DEFAULT_BIDDING_WINDOW_MS = 48 * 60 * 60 * 1000;

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveSeller = async (userId) => {
  const seller = await User.findById(userId).select("pseudonym trust");
  return {
    pseudonym: seller?.pseudonym || "unknown_seller",
    trust: {
      verifiedCampusBadge: Boolean(seller?.trust?.campusVerified),
      successfulTradeCount: seller?.trust?.successfulTradeCount || 0,
      reportsReceived: seller?.trust?.reportsReceived || 0,
    },
  };
};

const openPostFields = async (post) => {
  if (!post.encryptionMeta?.keyId || !post.protectedData || !post.recordMac) {
    return {
      title: post.title || "",
      desc: post.desc || "",
      content: post.content || "",
      img: post.img || "",
      crypto: {
        algorithm: "LEGACY",
        keyId: "none",
        domain: "legacy",
        integrity: "not-protected",
      },
    };
  }

  const keyRecord = await getKeyById(post.encryptionMeta.keyId);

  if (!keyRecord) {
    throw new Error("Encryption key metadata not found for post");
  }

  const plaintextFields = openProtectedRecord({
    protectedFields: post.protectedData,
    recordMac: post.recordMac,
    decryptionKey: {
      privateKey: keyRecord.runtime.privateKey,
    },
    macKeyHex: keyRecord.runtime.macKeyHex,
  });

  return {
    title: plaintextFields.title || "",
    desc: plaintextFields.desc || "",
    content: plaintextFields.content || "",
    img: plaintextFields.img || "",
    crypto: {
      algorithm: post.encryptionMeta.algorithm,
      keyId: post.encryptionMeta.keyId,
      domain: post.encryptionMeta.domain,
      integrity: "verified",
    },
  };
};

const toSafePost = async (postDoc) => {
  const post = postDoc.toObject();
  const seller = await resolveSeller(post.user);
  const opened = await openPostFields(post);

  return {
    _id: post._id,
    seller,
    slug: post.slug,
    category: post.category,
    isFeatured: post.isFeatured,
    visit: post.visit,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    title: opened.title,
    desc: opened.desc,
    content: opened.content,
    img: opened.img,
    market: {
      status: post.marketStatus || "open",
      biddingEndsAt: post.biddingEndsAt,
      isLocked: Boolean(post.isLocked),
      lockedAt: post.lockedAt,
      winningBid: post.winningBid,
    },
    crypto: opened.crypto,
  };
};

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });

    const openedPosts = await Promise.all(posts.map((post) => toSafePost(post)));
    res.status(200).json(openedPosts);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

export const getPost = async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const openedPost = await toSafePost(post);
    return res.status(200).json(openedPost);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch post" });
  }
};

export const createPost = async (req, res) => {
  try {
    const { slug, title, desc, content, img, category, isFeatured, biddingEndsAt } = req.body;
    const userId = req.auth?.userId;

    if (!userId || !slug || !title || !content) {
      return res.status(400).json({
        message: "authenticated user, slug, title and content are required",
      });
    }

    const resolvedBidEnd = biddingEndsAt ? toDate(biddingEndsAt) : new Date(Date.now() + DEFAULT_BIDDING_WINDOW_MS);

    if (!resolvedBidEnd || resolvedBidEnd.getTime() <= Date.now()) {
      return res.status(400).json({ message: "biddingEndsAt must be a valid future datetime" });
    }

    const keySet = await ensureKeySet({
      ownerId: String(userId),
      domain: POST_KEY_DOMAIN,
    });

    const { protectedFields, recordMac } = sealProtectedRecord({
      fields: {
        title,
        desc,
        content,
        img,
      },
      encryptionKey: {
        publicKey: keySet.ecc.runtime.publicKey,
      },
      keyId: keySet.ecc.keyId,
      macKeyHex: keySet.ecc.runtime.macKeyHex,
    });

    const newPost = new Post({
      user: userId,
      slug,
      category,
      isFeatured,
      marketStatus: "open",
      biddingEndsAt: resolvedBidEnd,
      isLocked: false,
      protectedData: protectedFields,
      recordMac,
      encryptionMeta: {
        algorithm: "ECC",
        keyId: keySet.ecc.keyId,
        domain: POST_KEY_DOMAIN,
      },
    });

    const post = await newPost.save();

    const openedPost = await toSafePost(post);
    res.status(201).json(openedPost);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "slug already exists" });
    }

    return res.status(500).json({ message: "Failed to create post" });
  }
};

export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isOwner = String(post.user) === String(req.auth?.userId);
    const isAdmin = req.auth?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: you cannot edit this post" });
    }

    if (post.isLocked && !isAdmin) {
      return res.status(409).json({ message: "Post is locked and cannot be edited" });
    }

    const current = await openPostFields(post.toObject());
    const { title, desc, content, img, category, isFeatured, biddingEndsAt } = req.body;

    const mergedFields = {
      title: title !== undefined ? String(title) : current.title,
      desc: desc !== undefined ? String(desc) : current.desc,
      content: content !== undefined ? String(content) : current.content,
      img: img !== undefined ? String(img) : current.img,
    };

    if (!mergedFields.title || !mergedFields.content) {
      return res.status(400).json({ message: "title and content cannot be empty" });
    }

    const keySet = await ensureKeySet({
      ownerId: String(post.user),
      domain: POST_KEY_DOMAIN,
    });

    const sealed = sealProtectedRecord({
      fields: mergedFields,
      encryptionKey: {
        publicKey: keySet.ecc.runtime.publicKey,
      },
      keyId: keySet.ecc.keyId,
      macKeyHex: keySet.ecc.runtime.macKeyHex,
    });

    post.protectedData = sealed.protectedFields;
    post.recordMac = sealed.recordMac;
    post.encryptionMeta = {
      algorithm: "ECC",
      keyId: keySet.ecc.keyId,
      domain: POST_KEY_DOMAIN,
    };

    if (category !== undefined) {
      post.category = String(category);
    }

    if (isFeatured !== undefined) {
      post.isFeatured = Boolean(isFeatured);
    }

    if (biddingEndsAt !== undefined && !post.isLocked) {
      const parsed = toDate(biddingEndsAt);

      if (!parsed || parsed.getTime() <= Date.now()) {
        return res.status(400).json({ message: "biddingEndsAt must be a valid future datetime" });
      }

      post.biddingEndsAt = parsed;
    }

    await post.save();
    const openedPost = await toSafePost(post);
    return res.status(200).json(openedPost);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update post" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isOwner = String(post.user) === String(req.auth?.userId);
    const isAdmin = req.auth?.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: you cannot delete this post" });
    }

    await Post.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: "Post deleted", post });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete post" });
  }
};
