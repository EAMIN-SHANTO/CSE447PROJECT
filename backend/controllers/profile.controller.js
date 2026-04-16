import User from "../models/user.model.js";
import Bid from "../models/bid.model.js";
import Post from "../models/post.model.js";
import UserReport from "../models/user-report.model.js";
import { ensureKeySet, getKeyById } from "../lib/crypto/key-manager.js";
import { openProtectedRecord, sealProtectedRecord } from "../lib/crypto/protected-record.js";

const USER_PROFILE_DOMAIN = "user-profile";

const openUserProfile = async (user) => {
  const keyRecord = await getKeyById(user.profileEncryptionMeta?.keyId);

  if (!keyRecord) {
    throw new Error("User profile key metadata not found");
  }

  const fields = openProtectedRecord({
    protectedFields: user.profileProtectedData,
    recordMac: user.profileRecordMac,
    decryptionKey: {
      privateKey: keyRecord.runtime.privateKey,
    },
    macKeyHex: keyRecord.runtime.macKeyHex,
  });

  return {
    email: fields.email || "",
    fullName: fields.fullName || "",
    contactInfo: fields.contactInfo || "",
  };
};

const shapeProfileResponse = (user, fields) => ({
  id: user._id,
  pseudonym: user.pseudonym,
  role: user.role,
  fullName: fields.fullName,
  contactInfo: fields.contactInfo,
  email: fields.email,
  twoFactor: {
    enabled: user.twoFactor?.enabled,
    method: user.twoFactor?.method,
    totpEnabled: Boolean(user.twoFactor?.totpEnabled),
    verifiedAt: user.twoFactor?.verifiedAt,
  },
  trust: {
    verifiedCampusBadge: Boolean(user.trust?.campusVerified),
    successfulTradeCount: user.trust?.successfulTradeCount || 0,
    reportsReceived: user.trust?.reportsReceived || 0,
  },
});

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const fields = await openUserProfile(user);

    return res.status(200).json({
      profile: shapeProfileResponse(user, fields),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { pseudonym, fullName, contactInfo } = req.body;

    if (pseudonym && String(pseudonym).trim().toLowerCase() !== user.pseudonym) {
      const candidate = String(pseudonym).trim().toLowerCase();
      const conflict = await User.findOne({ pseudonym: candidate, _id: { $ne: user._id } });

      if (conflict) {
        return res.status(409).json({ message: "Pseudonym already in use" });
      }

      user.pseudonym = candidate;
    }

    const currentProfile = await openUserProfile(user);

    const nextProfile = {
      email: currentProfile.email,
      fullName: fullName !== undefined ? String(fullName) : currentProfile.fullName,
      contactInfo: contactInfo !== undefined ? String(contactInfo) : currentProfile.contactInfo,
    };

    const keySet = await ensureKeySet({
      ownerId: String(user._id),
      domain: USER_PROFILE_DOMAIN,
    });

    const sealed = sealProtectedRecord({
      fields: nextProfile,
      encryptionKey: {
        publicKey: keySet.ecc.runtime.publicKey,
      },
      keyId: keySet.ecc.keyId,
      macKeyHex: keySet.ecc.runtime.macKeyHex,
    });

    user.profileProtectedData = sealed.protectedFields;
    user.profileRecordMac = sealed.recordMac;
    user.profileEncryptionMeta = {
      algorithm: "ECC",
      keyId: keySet.ecc.keyId,
      domain: USER_PROFILE_DOMAIN,
    };

    await user.save();

    return res.status(200).json({
      message: "Profile updated",
      profile: shapeProfileResponse(user, nextProfile),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
};

export const getProfileByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const fields = await openUserProfile(user);

    return res.status(200).json({
      profile: shapeProfileResponse(user, fields),
      viewedBy: {
        id: req.auth.userId,
        role: req.auth.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const reportUser = async (req, res) => {
  try {
    const reporterId = req.auth?.userId;
    const { reportedUserId, reason, postId = null, bidId = null } = req.body;

    if (!reporterId || !reportedUserId || !reason) {
      return res.status(400).json({ message: "reportedUserId and reason are required" });
    }

    if (String(reportedUserId) === String(reporterId)) {
      return res.status(400).json({ message: "You cannot report your own account" });
    }

    const reportedUser = await User.findById(reportedUserId);

    if (!reportedUser) {
      return res.status(404).json({ message: "Reported user not found" });
    }

    if (postId) {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found for report" });
      }
    }

    if (bidId) {
      const bid = await Bid.findById(bidId);
      if (!bid) {
        return res.status(404).json({ message: "Bid not found for report" });
      }
    }

    const report = await UserReport.create({
      reporter: reporterId,
      reportedUser: reportedUserId,
      post: postId,
      bid: bidId,
      reason: String(reason),
      status: "open",
    });

    await User.updateOne(
      { _id: reportedUserId },
      {
        $inc: {
          "trust.reportsReceived": 1,
        },
      }
    );

    return res.status(201).json({
      message: "User report submitted for admin review",
      reportId: report._id,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit report" });
  }
};
