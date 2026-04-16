import Post from "../models/post.model.js";
import { ensureKeySet, getKeyById } from "../lib/crypto/key-manager.js";
import { openProtectedRecord, sealProtectedRecord } from "../lib/crypto/protected-record.js";

const POST_KEY_DOMAIN = "post-data";

const toSafePost = async (postDoc) => {
  const post = postDoc.toObject();

  if (!post.encryptionMeta?.keyId || !post.protectedData || !post.recordMac) {
    return {
      _id: post._id,
      user: post.user,
      slug: post.slug,
      category: post.category,
      isFeatured: post.isFeatured,
      visit: post.visit,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
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

  const keyRecord = await getKeyById(post.encryptionMeta?.keyId);

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
    _id: post._id,
    user: post.user,
    slug: post.slug,
    category: post.category,
    isFeatured: post.isFeatured,
    visit: post.visit,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
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

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find();

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
    const { user, slug, title, desc, content, img, category, isFeatured } = req.body;

    if (!user || !slug || !title || !content) {
      return res.status(400).json({
        message: "user, slug, title and content are required",
      });
    }

    const keySet = await ensureKeySet({
      ownerId: String(user),
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
      user,
      slug,
      category,
      isFeatured,
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
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json({ message: "Post deleted", post });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete post" });
  }
};
