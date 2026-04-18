import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { ensureKeySet, getKeyById } from "../lib/crypto/key-manager.js";
import { openProtectedRecord, sealProtectedRecord } from "../lib/crypto/protected-record.js";

const MESSAGE_KEY_DOMAIN = "message-data";

const normalizeText = (value) => String(value || "").trim();

const isParticipant = (conversation, userId) =>
  String(conversation.buyer) === String(userId) || String(conversation.seller) === String(userId);

const openMessageContent = async (messageDoc) => {
  const message = messageDoc.toObject();
  const keyRecord = await getKeyById(message.encryptionMeta?.keyId);

  if (!keyRecord) {
    throw new Error("Message encryption key not found");
  }

  const opened = openProtectedRecord({
    protectedFields: message.protectedData,
    recordMac: message.recordMac,
    decryptionKey: {
      privateKey: keyRecord.runtime.privateKey,
    },
    macKeyHex: keyRecord.runtime.macKeyHex,
  });

  return {
    ...message,
    content: opened.content || "",
  };
};

const buildMessage = async ({ senderId, conversationId, content }) => {
  const keySet = await ensureKeySet({
    ownerId: String(senderId),
    domain: MESSAGE_KEY_DOMAIN,
  });

  const sealed = sealProtectedRecord({
    fields: {
      content,
    },
    encryptionKey: {
      publicKey: keySet.ecc.runtime.publicKey,
    },
    keyId: keySet.ecc.keyId,
    macKeyHex: keySet.ecc.runtime.macKeyHex,
  });

  const created = await Message.create({
    conversation: conversationId,
    sender: senderId,
    protectedData: sealed.protectedFields,
    recordMac: sealed.recordMac,
    encryptionMeta: {
      algorithm: "ECC",
      keyId: keySet.ecc.keyId,
      domain: MESSAGE_KEY_DOMAIN,
    },
  });

  return created;
};

const getPseudonymMap = async (userIds) => {
  const uniqueUserIds = [...new Set(userIds.map((id) => String(id)))];
  const users = await User.find({ _id: { $in: uniqueUserIds } }).select("pseudonym");

  return users.reduce((acc, user) => {
    acc[String(user._id)] = user.pseudonym;
    return acc;
  }, {});
};

export const createInquiryMessage = async (req, res) => {
  try {
    const actorId = req.auth?.userId;
    const { postId } = req.params;
    const content = normalizeText(req.body?.content);

    if (!actorId || !postId || !content) {
      return res.status(400).json({ message: "postId and content are required" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (String(post.user) === String(actorId)) {
      return res.status(400).json({ message: "Seller cannot create inquiry to own post" });
    }

    const buyerId = actorId;
    const sellerId = post.user;

    let conversation = await Conversation.findOne({
      post: post._id,
      buyer: buyerId,
      seller: sellerId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        post: post._id,
        buyer: buyerId,
        seller: sellerId,
        lastMessageAt: new Date(),
        lastMessageSender: buyerId,
      });
    }

    const created = await buildMessage({
      senderId: actorId,
      conversationId: conversation._id,
      content,
    });

    conversation.lastMessageAt = created.createdAt;
    conversation.lastMessageSender = actorId;
    await conversation.save();

    return res.status(201).json({
      message: "Inquiry message sent",
      conversationId: conversation._id,
    });
  } catch {
    return res.status(500).json({ message: "Failed to send inquiry message" });
  }
};

export const getInbox = async (req, res) => {
  try {
    const actorId = req.auth?.userId;

    const conversations = await Conversation.find({
      $or: [{ buyer: actorId }, { seller: actorId }],
    })
      .populate("post", "slug")
      .sort({ lastMessageAt: -1 });

    const participantIds = [];

    conversations.forEach((conversation) => {
      participantIds.push(conversation.buyer);
      participantIds.push(conversation.seller);
      if (conversation.lastMessageSender) {
        participantIds.push(conversation.lastMessageSender);
      }
    });

    const pseudonymMap = await getPseudonymMap(participantIds);

    const inbox = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await Message.findOne({ conversation: conversation._id }).sort({ createdAt: -1 });

        let preview = "";

        if (lastMessage) {
          try {
            const opened = await openMessageContent(lastMessage);
            preview = opened.content.slice(0, 120);
          } catch {
            preview = "[message integrity check failed]";
          }
        }

        const counterpartId =
          String(conversation.buyer) === String(actorId)
            ? String(conversation.seller)
            : String(conversation.buyer);

        return {
          conversationId: conversation._id,
          postId: conversation.post?._id || null,
          postSlug: conversation.post?.slug || null,
          counterpart: {
            id: counterpartId,
            pseudonym: pseudonymMap[counterpartId] || "unknown_user",
          },
          lastMessagePreview: preview,
          lastMessageAt: conversation.lastMessageAt,
        };
      })
    );

    return res.status(200).json({ conversations: inbox });
  } catch {
    return res.status(500).json({ message: "Failed to load inbox" });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const actorId = req.auth?.userId;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId).populate("post", "slug");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!isParticipant(conversation, actorId)) {
      return res.status(403).json({ message: "Not authorized for this conversation" });
    }

    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
    const senderIds = messages.map((msg) => msg.sender);
    senderIds.push(conversation.buyer, conversation.seller);

    const pseudonymMap = await getPseudonymMap(senderIds);

    const safeMessages = await Promise.all(
      messages.map(async (messageDoc) => {
        const opened = await openMessageContent(messageDoc);

        return {
          id: opened._id,
          senderId: opened.sender,
          senderPseudonym: pseudonymMap[String(opened.sender)] || "unknown_user",
          content: opened.content,
          createdAt: opened.createdAt,
          crypto: {
            algorithm: opened.encryptionMeta?.algorithm || "ECC",
            integrity: "verified",
          },
        };
      })
    );

    return res.status(200).json({
      conversation: {
        id: conversation._id,
        postId: conversation.post?._id || null,
        postSlug: conversation.post?.slug || null,
        buyer: {
          id: conversation.buyer,
          pseudonym: pseudonymMap[String(conversation.buyer)] || "unknown_user",
        },
        seller: {
          id: conversation.seller,
          pseudonym: pseudonymMap[String(conversation.seller)] || "unknown_user",
        },
      },
      messages: safeMessages,
    });
  } catch {
    return res.status(500).json({ message: "Failed to load conversation" });
  }
};

export const replyToConversation = async (req, res) => {
  try {
    const actorId = req.auth?.userId;
    const { conversationId } = req.params;
    const content = normalizeText(req.body?.content);

    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!isParticipant(conversation, actorId)) {
      return res.status(403).json({ message: "Not authorized for this conversation" });
    }

    const created = await buildMessage({
      senderId: actorId,
      conversationId: conversation._id,
      content,
    });

    conversation.lastMessageAt = created.createdAt;
    conversation.lastMessageSender = actorId;
    await conversation.save();

    return res.status(201).json({ message: "Message sent" });
  } catch {
    return res.status(500).json({ message: "Failed to send message" });
  }
};
