import Bid from "../models/bid.model.js";
import Post from "../models/post.model.js";
import TradeDispute from "../models/trade-dispute.model.js";
import User from "../models/user.model.js";
import { createSalt, hashWithSalt } from "../lib/auth/password.js";
import { ensureKeySet, getKeyById } from "../lib/crypto/key-manager.js";
import { openProtectedRecord, sealProtectedRecord } from "../lib/crypto/protected-record.js";

const BID_KEY_DOMAIN = "bid-data";
const TRANSACTION_KEY_DOMAIN = "transaction-package";
const EXCHANGE_CODE_TTL_MS = 48 * 60 * 60 * 1000;

const randomExchangeCode = () => {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `BRACU-${digits}`;
};

const resolveUserTrust = async (userId) => {
  const user = await User.findById(userId).select("pseudonym trust");
  return {
    pseudonym: user?.pseudonym || "unknown_user",
    trust: {
      campusVerified: Boolean(user?.trust?.campusVerified),
      successfulTradeCount: user?.trust?.successfulTradeCount || 0,
      reportsReceived: user?.trust?.reportsReceived || 0,
    },
  };
};

const openBidFields = async (bid) => {
  const keyRecord = await getKeyById(bid.encryptionMeta?.keyId);

  if (!keyRecord) {
    throw new Error("Bid encryption key not found");
  }

  const opened = openProtectedRecord({
    protectedFields: bid.protectedData,
    recordMac: bid.recordMac,
    decryptionKey: {
      privateKey: keyRecord.runtime.privateKey,
    },
    macKeyHex: keyRecord.runtime.macKeyHex,
  });

  return {
    offerAmount: opened.offerAmount || "",
    note: opened.note || "",
    crypto: {
      algorithm: bid.encryptionMeta.algorithm,
      keyId: bid.encryptionMeta.keyId,
      domain: bid.encryptionMeta.domain,
      integrity: "verified",
    },
  };
};

const openMeetupPackage = async (bid) => {
  if (!bid.transaction?.meetupEncryptionMeta?.keyId || !bid.transaction?.meetupRecordMac) {
    return null;
  }

  const keyRecord = await getKeyById(bid.transaction.meetupEncryptionMeta.keyId);

  if (!keyRecord) {
    throw new Error("Transaction meetup encryption key not found");
  }

  const opened = openProtectedRecord({
    protectedFields: bid.transaction.meetupProtectedData,
    recordMac: bid.transaction.meetupRecordMac,
    decryptionKey: {
      privateKey: keyRecord.runtime.privateKey,
    },
    macKeyHex: keyRecord.runtime.macKeyHex,
  });

  return {
    meetupLocation: opened.meetupLocation || "",
    meetupTime: opened.meetupTime || "",
    meetupNote: opened.meetupNote || "",
  };
};

const toSafeBid = async (bidDoc, includeTransaction = false) => {
  const bid = bidDoc.toObject();
  const opened = await openBidFields(bid);
  const seller = await resolveUserTrust(bid.seller);
  const bidder = await resolveUserTrust(bid.bidder);

  const safeBid = {
    _id: bid._id,
    post: bid.post,
    seller,
    bidder,
    status: bid.status,
    offerAmount: opened.offerAmount,
    note: opened.note,
    createdAt: bid.createdAt,
    acceptedAt: bid.acceptedAt,
    rejectedAt: bid.rejectedAt,
    crypto: opened.crypto,
  };

  if (includeTransaction) {
    const meetup = await openMeetupPackage(bid);
    safeBid.transaction = {
      winnerReference: bid.transaction?.winnerReference || null,
      exchangeCode: {
        required: Boolean(bid.transaction?.exchangeCodeHash),
        expiresAt: bid.transaction?.exchangeCodeExpiresAt || null,
        usedAt: bid.transaction?.exchangeCodeUsedAt || null,
      },
      meetup,
      confirmations: bid.transaction?.confirmations || {
        seller: { status: "pending", at: null, note: "" },
        buyer: { status: "pending", at: null, note: "" },
      },
      disputeStatus: bid.transaction?.disputeStatus || "none",
      disputeId: bid.transaction?.disputeId || null,
    };
  }

  return safeBid;
};

const getRoleInBid = (bid, actorId, actorRole) => {
  if (String(bid.seller) === String(actorId)) {
    return "seller";
  }

  if (String(bid.bidder) === String(actorId)) {
    return "buyer";
  }

  if (actorRole === "admin") {
    return "admin";
  }

  return null;
};

const createDispute = async ({ bid, post, openedBy, reason }) => {
  const dispute = await TradeDispute.create({
    bid: bid._id,
    post: post._id,
    seller: bid.seller,
    buyer: bid.bidder,
    openedBy,
    reason: reason || "Confirmation mismatch",
    status: "open",
  });

  bid.status = "disputed";
  bid.transaction.disputeStatus = "open";
  bid.transaction.disputeId = dispute._id;
  await bid.save();

  return dispute;
};

export const createBid = async (req, res) => {
  try {
    const { postId, offerAmount, note = "" } = req.body;
    const bidderId = req.auth?.userId;

    if (!bidderId || !postId || offerAmount === undefined) {
      return res.status(400).json({ message: "postId and offerAmount are required" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.marketStatus !== "open" || post.isLocked) {
      return res.status(409).json({ message: "Bidding is closed for this post" });
    }

    if (post.biddingEndsAt && post.biddingEndsAt.getTime() <= Date.now()) {
      return res.status(409).json({ message: "Bidding deadline has passed" });
    }

    if (String(post.user) === String(bidderId)) {
      return res.status(400).json({ message: "Seller cannot bid on own post" });
    }

    const existing = await Bid.findOne({
      post: post._id,
      bidder: bidderId,
      status: "pending",
    });

    if (existing) {
      return res.status(409).json({ message: "You already have a pending bid on this post" });
    }

    const keySet = await ensureKeySet({
      ownerId: String(bidderId),
      domain: BID_KEY_DOMAIN,
    });

    const sealed = sealProtectedRecord({
      fields: {
        offerAmount: String(offerAmount),
        note: String(note),
      },
      encryptionKey: {
        publicKey: keySet.ecc.runtime.publicKey,
      },
      keyId: keySet.ecc.keyId,
      macKeyHex: keySet.ecc.runtime.macKeyHex,
    });

    const bid = await Bid.create({
      post: post._id,
      seller: post.user,
      bidder: bidderId,
      status: "pending",
      protectedData: sealed.protectedFields,
      recordMac: sealed.recordMac,
      encryptionMeta: {
        algorithm: "ECC",
        keyId: keySet.ecc.keyId,
        domain: BID_KEY_DOMAIN,
      },
    });

    const safeBid = await toSafeBid(bid);
    return res.status(201).json(safeBid);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create bid" });
  }
};

export const listBidsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const actorId = req.auth?.userId;
    const actorRole = req.auth?.role;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isSeller = String(post.user) === String(actorId);
    const isAdmin = actorRole === "admin";

    const query = { post: post._id };

    if (!isSeller && !isAdmin) {
      query.bidder = actorId;
    }

    const bids = await Bid.find(query).sort({ createdAt: -1 });
    const safeBids = await Promise.all(bids.map((bid) => toSafeBid(bid, true)));

    return res.status(200).json({
      postId,
      visibleTo: isSeller || isAdmin ? "seller-or-admin" : "bidder",
      bids: safeBids,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to list bids" });
  }
};

export const acceptBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { meetupLocation, meetupTime, meetupNote = "" } = req.body;
    const actorId = req.auth?.userId;
    const actorRole = req.auth?.role;

    if (!meetupLocation || !meetupTime) {
      return res.status(400).json({ message: "meetupLocation and meetupTime are required" });
    }

    const bid = await Bid.findById(bidId);

    if (!bid) {
      return res.status(404).json({ message: "Bid not found" });
    }

    const post = await Post.findById(bid.post);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isSeller = String(post.user) === String(actorId);
    const isAdmin = actorRole === "admin";

    if (!isSeller && !isAdmin) {
      return res.status(403).json({ message: "Only seller can accept a bid" });
    }

    if (post.marketStatus !== "open" || post.isLocked) {
      return res.status(409).json({ message: "Post is already locked" });
    }

    if (post.biddingEndsAt && post.biddingEndsAt.getTime() <= Date.now()) {
      return res.status(409).json({ message: "Cannot accept bid after bidding deadline" });
    }

    const bidderTrust = await resolveUserTrust(bid.bidder);
    const exchangeCode = randomExchangeCode();
    const exchangeSalt = createSalt();
    const exchangeCodeHash = hashWithSalt({
      value: exchangeCode,
      salt: exchangeSalt,
    });

    const keySet = await ensureKeySet({
      ownerId: String(post.user),
      domain: TRANSACTION_KEY_DOMAIN,
    });

    const sealedMeetup = sealProtectedRecord({
      fields: {
        meetupLocation: String(meetupLocation),
        meetupTime: String(meetupTime),
        meetupNote: String(meetupNote),
      },
      encryptionKey: {
        publicKey: keySet.ecc.runtime.publicKey,
      },
      keyId: keySet.ecc.keyId,
      macKeyHex: keySet.ecc.runtime.macKeyHex,
    });

    bid.status = "accepted";
    bid.acceptedAt = new Date();
    bid.transaction = {
      winnerReference: {
        bidderId: bid.bidder,
        bidderPseudonym: bidderTrust.pseudonym,
      },
      exchangeCodeHash,
      exchangeCodeSalt: exchangeSalt,
      exchangeCodeExpiresAt: new Date(Date.now() + EXCHANGE_CODE_TTL_MS),
      exchangeCodeUsedAt: null,
      meetupProtectedData: sealedMeetup.protectedFields,
      meetupRecordMac: sealedMeetup.recordMac,
      meetupEncryptionMeta: {
        algorithm: "ECC",
        keyId: keySet.ecc.keyId,
        domain: TRANSACTION_KEY_DOMAIN,
      },
      confirmations: {
        seller: {
          status: "pending",
          at: null,
          note: "",
        },
        buyer: {
          status: "pending",
          at: null,
          note: "",
        },
      },
      disputeStatus: "none",
      disputeId: null,
    };

    await bid.save();

    await Bid.updateMany(
      {
        post: post._id,
        _id: { $ne: bid._id },
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
        },
      }
    );

    post.marketStatus = "locked";
    post.isLocked = true;
    post.lockedAt = new Date();
    post.winningBid = bid._id;
    await post.save();

    const safeBid = await toSafeBid(bid, true);

    return res.status(200).json({
      message: "Bid accepted. Post is now locked.",
      acceptedBid: safeBid,
      transactionPackage: {
        winnerReference: bid.transaction.winnerReference,
        exchangeCode,
        exchangeCodeExpiresAt: bid.transaction.exchangeCodeExpiresAt,
        meetup: {
          meetupLocation,
          meetupTime,
          meetupNote,
        },
      },
      postLock: {
        postId: post._id,
        status: post.marketStatus,
        isLocked: post.isLocked,
        lockedAt: post.lockedAt,
        winningBid: post.winningBid,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to accept bid" });
  }
};

export const getBidTransactionPackage = async (req, res) => {
  try {
    const { bidId } = req.params;
    const actorId = req.auth?.userId;
    const actorRole = req.auth?.role;

    const bid = await Bid.findById(bidId);

    if (!bid) {
      return res.status(404).json({ message: "Bid not found" });
    }

    const roleInBid = getRoleInBid(bid, actorId, actorRole);

    if (!roleInBid) {
      return res.status(403).json({ message: "Forbidden: not a participant in this transaction" });
    }

    const safeBid = await toSafeBid(bid, true);

    return res.status(200).json({
      bid: safeBid,
      actorRoleInTransaction: roleInBid,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch transaction package" });
  }
};

export const confirmBidHandoff = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { outcome, note = "", exchangeCode } = req.body;
    const actorId = req.auth?.userId;
    const actorRole = req.auth?.role;

    if (!["completed", "failed"].includes(outcome)) {
      return res.status(400).json({ message: "outcome must be completed or failed" });
    }

    const bid = await Bid.findById(bidId);

    if (!bid) {
      return res.status(404).json({ message: "Bid not found" });
    }

    const post = await Post.findById(bid.post);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const roleInBid = getRoleInBid(bid, actorId, actorRole);

    if (!roleInBid || roleInBid === "admin") {
      return res.status(403).json({ message: "Only buyer or seller can confirm handoff" });
    }

    if (!["accepted", "disputed"].includes(bid.status)) {
      return res.status(409).json({
        message: `Handoff confirmation is only allowed after bid acceptance (current status: ${bid.status})`,
      });
    }

    if (!bid.transaction?.exchangeCodeHash) {
      return res.status(409).json({ message: "Transaction package not initialized" });
    }

    if (roleInBid === "buyer" && outcome === "completed") {
      if (!exchangeCode) {
        return res.status(400).json({ message: "exchangeCode is required for buyer completion confirmation" });
      }

      if (
        !bid.transaction.exchangeCodeExpiresAt ||
        bid.transaction.exchangeCodeExpiresAt.getTime() <= Date.now()
      ) {
        return res.status(409).json({ message: "Exchange code expired" });
      }

      const computed = hashWithSalt({
        value: String(exchangeCode),
        salt: bid.transaction.exchangeCodeSalt,
      });

      if (computed !== bid.transaction.exchangeCodeHash) {
        return res.status(401).json({ message: "Invalid exchange code" });
      }

      if (!bid.transaction.exchangeCodeUsedAt) {
        bid.transaction.exchangeCodeUsedAt = new Date();
      }
    }

    bid.transaction.confirmations[roleInBid] = {
      status: outcome,
      at: new Date(),
      note: String(note),
    };

    const sellerStatus = bid.transaction.confirmations?.seller?.status || "pending";
    const buyerStatus = bid.transaction.confirmations?.buyer?.status || "pending";

    if (sellerStatus !== "pending" && buyerStatus !== "pending") {
      if (sellerStatus === "completed" && buyerStatus === "completed") {
        bid.status = "completed";
        bid.transaction.disputeStatus = "none";
        post.marketStatus = "completed";

        await Promise.all([
          User.updateOne({ _id: bid.seller }, { $inc: { "trust.successfulTradeCount": 1 } }),
          User.updateOne({ _id: bid.bidder }, { $inc: { "trust.successfulTradeCount": 1 } }),
        ]);
      } else {
        const dispute = await createDispute({
          bid,
          post,
          openedBy: actorId,
          reason: "Buyer and seller confirmation mismatch",
        });

        await post.save();

        return res.status(200).json({
          message: "Confirmation mismatch detected. Dispute opened for admin review.",
          disputeId: dispute._id,
          bidStatus: bid.status,
        });
      }
    }

    await bid.save();
    await post.save();

    return res.status(200).json({
      message: "Handoff confirmation submitted",
      bidStatus: bid.status,
      postStatus: post.marketStatus,
      confirmations: bid.transaction.confirmations,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to confirm handoff" });
  }
};
