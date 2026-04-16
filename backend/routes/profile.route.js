import express from "express";
import {
	getMyProfile,
	getProfileByAdmin,
	reportUser,
	updateMyProfile,
} from "../controllers/profile.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorize-role.js";

const router = express.Router();

router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, updateMyProfile);
router.post("/report", authenticate, reportUser);
router.get("/:userId", authenticate, authorizeRole("admin"), getProfileByAdmin);

export default router;
