import express from "express";
import {
	login,
	logout,
	refreshSession,
	register,
	verifySecondFactor,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-2fa", verifySecondFactor);
router.post("/refresh", refreshSession);
router.post("/logout", logout);

export default router;
