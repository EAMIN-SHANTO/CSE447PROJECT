import express from "express";
import {
	getAdminStatus,
	listOpenDisputes,
	listUserReports,
	resolveDispute,
	resolveUserReport,
} from "../controllers/admin.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorize-role.js";

const router = express.Router();

router.get("/status", authenticate, authorizeRole("admin"), getAdminStatus);
router.get("/disputes", authenticate, authorizeRole("admin"), listOpenDisputes);
router.patch("/disputes/:disputeId", authenticate, authorizeRole("admin"), resolveDispute);
router.get("/reports", authenticate, authorizeRole("admin"), listUserReports);
router.patch("/reports/:reportId", authenticate, authorizeRole("admin"), resolveUserReport);

export default router;
