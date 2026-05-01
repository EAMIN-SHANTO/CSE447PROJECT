import AuthSession from "../models/auth-session.model.js";
import Bid from "../models/bid.model.js";
import Post from "../models/post.model.js";
import TradeDispute from "../models/trade-dispute.model.js";
import User from "../models/user.model.js";
import UserReport from "../models/user-report.model.js";
import AuditLog from "../models/audit-log.model.js";

export const getAdminStatus = async (req, res) => {
  try {
    const [userCount, adminCount, postCount, activeSessions, openDisputes, openReports] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      Post.countDocuments(),
      AuthSession.countDocuments({
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }),
      TradeDispute.countDocuments({ status: "open" }),
      UserReport.countDocuments({ status: "open" }),
    ]);

    return res.status(200).json({
      message: "Admin access verified",
      actor: {
        id: req.auth.userId,
        role: req.auth.role,
      },
      metrics: {
        users: userCount,
        admins: adminCount,
        posts: postCount,
        activeSessions,
        openDisputes,
        openReports,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch admin status" });
  }
};

export const listOpenDisputes = async (req, res) => {
  try {
    const disputes = await TradeDispute.find({ status: "open" })
      .sort({ createdAt: -1 })
      .populate("seller", "pseudonym")
      .populate("buyer", "pseudonym");

    const shaped = disputes.map((dispute) => ({
      id: dispute._id,
      bid: dispute.bid,
      post: dispute.post,
      seller: dispute.seller,
      buyer: dispute.buyer,
      openedBy: dispute.openedBy,
      reason: dispute.reason,
      status: dispute.status,
      createdAt: dispute.createdAt,
    }));

    return res.status(200).json({ disputes: shaped });
  } catch (error) {
    return res.status(500).json({ message: "Failed to list disputes" });
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { action = "keep-disputed", note = "" } = req.body;

    const dispute = await TradeDispute.findById(disputeId);

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    if (dispute.status !== "open") {
      return res.status(409).json({ message: "Dispute is already resolved" });
    }

    const bid = await Bid.findById(dispute.bid);
    const post = await Post.findById(dispute.post);

    if (!bid || !post) {
      return res.status(404).json({ message: "Linked bid or post missing" });
    }

    if (action === "complete-trade") {
      bid.status = "completed";
      bid.transaction.disputeStatus = "resolved";
      post.marketStatus = "completed";

      await Promise.all([
        User.updateOne({ _id: bid.seller }, { $inc: { "trust.successfulTradeCount": 1 } }),
        User.updateOne({ _id: bid.bidder }, { $inc: { "trust.successfulTradeCount": 1 } }),
      ]);
    } else if (action === "cancel-trade") {
      bid.status = "cancelled";
      bid.transaction.disputeStatus = "resolved";
      post.marketStatus = "cancelled";
    } else {
      bid.transaction.disputeStatus = "open";
      bid.status = "disputed";
    }

    dispute.status = action === "keep-disputed" ? "dismissed" : "resolved";
    dispute.resolutionNote = String(note);
    dispute.resolvedAt = new Date();

    await Promise.all([dispute.save(), bid.save(), post.save()]);

    return res.status(200).json({
      message: "Dispute resolution recorded",
      dispute: {
        id: dispute._id,
        status: dispute.status,
        resolutionNote: dispute.resolutionNote,
      },
      bidStatus: bid.status,
      postStatus: post.marketStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to resolve dispute" });
  }
};

export const listUserReports = async (req, res) => {
  try {
    const reports = await UserReport.find({})
      .sort({ createdAt: -1 })
      .populate("reporter", "pseudonym")
      .populate("reportedUser", "pseudonym");

    return res.status(200).json({ reports });
  } catch (error) {
    return res.status(500).json({ message: "Failed to list reports" });
  }
};

export const resolveUserReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status = "reviewed", adminNote = "" } = req.body;

    if (!["reviewed", "resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ message: "Invalid report status" });
    }

    const report = await UserReport.findById(reportId);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = status;
    report.adminNote = String(adminNote);
    report.resolvedAt = new Date();
    await report.save();

    return res.status(200).json({
      message: "Report status updated",
      report: {
        id: report._id,
        status: report.status,
        adminNote: report.adminNote,
        resolvedAt: report.resolvedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to resolve report" });
  }
};

export const listAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("actor", "pseudonym role");

    return res.status(200).json({ logs });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};

export const listUsers = async (req, res) => {
  try {
    const users = await User.find({}, "pseudonym role accountStatus trust createdAt lastLoginAt")
      .sort({ createdAt: -1 })
      .limit(200);

    return res.status(200).json({ users });
  } catch (error) {
    return res.status(500).json({ message: "Failed to list users" });
  }
};

export const toggleUserBan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBanned } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin" || (req.auth?.role === "staff" && user.role === "staff")) {
      return res.status(403).json({ message: "You cannot ban this user due to role hierarchy" });
    }

    user.accountStatus = isBanned ? "banned" : "active";
    await user.save();

    return res.status(200).json({
      message: `User has been ${isBanned ? "banned" : "unbanned"}`,
      user: {
        id: user._id,
        pseudonym: user.pseudonym,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to toggle ban status" });
  }
};

export const toggleUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "staff"].includes(role)) {
      return res.status(400).json({ message: "Invalid role assignment" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot change the role of an admin" });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      message: `User role successfully updated to ${role}`,
      user: {
        id: user._id,
        pseudonym: user.pseudonym,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to change user role" });
  }
};
