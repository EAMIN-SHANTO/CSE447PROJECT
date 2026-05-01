import express from "express";
import {
	getAdminStatus,
	listOpenDisputes,
	listUserReports,
	resolveDispute,
	resolveUserReport,
	listAuditLogs,
	listUsers,
	toggleUserBan,
	toggleUserRole,
} from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorize-role.js";

const router = express.Router();

router.get("/status", authenticate, authorizeRole("admin", "staff"), getAdminStatus);
router.get("/disputes", authenticate, authorizeRole("admin", "staff"), listOpenDisputes);
router.patch("/disputes/:disputeId", authenticate, authorizeRole("admin", "staff"), resolveDispute);
router.get("/reports", authenticate, authorizeRole("admin", "staff"), listUserReports);
router.patch("/reports/:reportId", authenticate, authorizeRole("admin", "staff"), resolveUserReport);
router.get("/audit-logs", authenticate, authorizeRole("admin"), listAuditLogs);
router.get("/users", authenticate, authorizeRole("admin", "staff"), listUsers);
router.patch("/users/:userId/ban", authenticate, authorizeRole("admin", "staff"), toggleUserBan);
router.patch("/users/:userId/role", authenticate, authorizeRole("admin"), toggleUserRole);

export default router;
