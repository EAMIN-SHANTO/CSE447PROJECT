import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { ensureKeySet, getKeyById } from "../lib/crypto/key-manager.js";
import { openProtectedRecord, sealProtectedRecord } from "../lib/crypto/protected-record.js";

const COMMENT_KEY_DOMAIN = "comment-data";

const resolvePseudonym = async (userId) => {
  const user = await User.findById(userId).select("pseudonym");
  return user?.pseudonym || "unknown_user";
};

const toSafeComment = async (commentDoc) => {
  const comment = commentDoc.toObject();
  const keyRecord = await getKeyById(comment.encryptionMeta?.keyId);

  if (!keyRecord) {
    throw new Error("Comment encryption key not found");
  }

  const opened = openProtectedRecord({
    protectedFields: comment.protectedData,
    recordMac: comment.recordMac,
    decryptionKey: {
      privateKey: keyRecord.runtime.privateKey,
    },
    macKeyHex: keyRecord.runtime.macKeyHex,
  });

  return {
    _id: comment._id,
    post: comment.post,
    parentComment: comment.parentComment,
    author: {
      pseudonym: await resolvePseudonym(comment.author),
    },
    content: opened.content || "",
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isEdited: comment.isEdited,
    crypto: {
      algorithm: comment.encryptionMeta.algorithm,
      keyId: comment.encryptionMeta.keyId,
      domain: comment.encryptionMeta.domain,
      integrity: "verified",
    },
  };
};

export const listComments = async (req, res) => {
  try {
    const postId = req.params.postId || req.query.postId;

    if (!postId) {
      return res.status(400).json({ message: "postId is required" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comments = await Comment.find({ post: postId }).sort({ createdAt: -1 });
    const safeComments = await Promise.all(comments.map((comment) => toSafeComment(comment)));

    return res.status(200).json({
      postId,
      comments: safeComments,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to list comments" });
  }
};

export const createComment = async (req, res) => {
  try {
    const { postId, content, parentComment = null } = req.body;
    const authorId = req.auth?.userId;

    if (!authorId || !postId || !content) {
      return res.status(400).json({ message: "postId and content are required" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.isLocked || post.marketStatus !== "open") {
      return res.status(409).json({ message: "Comments are closed for this post" });
    }

    if (parentComment) {
      const parent = await Comment.findById(parentComment);

      if (!parent || String(parent.post) !== String(postId)) {
        return res.status(400).json({ message: "Invalid parentComment for this post" });
      }
    }

    const keySet = await ensureKeySet({
      ownerId: String(authorId),
      domain: COMMENT_KEY_DOMAIN,
    });

    const sealed = sealProtectedRecord({
      fields: {
        content: String(content),
      },
      encryptionKey: {
        publicKey: keySet.ecc.runtime.publicKey,
      },
      keyId: keySet.ecc.keyId,
      macKeyHex: keySet.ecc.runtime.macKeyHex,
    });

    const comment = await Comment.create({
      post: postId,
      author: authorId,
      parentComment,
      protectedData: sealed.protectedFields,
      recordMac: sealed.recordMac,
      encryptionMeta: {
        algorithm: "ECC",
        keyId: keySet.ecc.keyId,
        domain: COMMENT_KEY_DOMAIN,
      },
    });

    const safeComment = await toSafeComment(comment);
    return res.status(201).json(safeComment);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create comment" });
  }
};
