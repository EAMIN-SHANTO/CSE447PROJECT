import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
	login,
	logout,
	requestSignupOtp,
	refreshSession,
	register,
	verifySecondFactor,
	disableTotp,
	setupTotp,
	verifyTotpSetup,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register/request-otp", requestSignupOtp);
router.post("/register", register);
router.post("/login", login);
router.post("/verify-2fa", verifySecondFactor);
router.post("/refresh", refreshSession);
router.post("/logout", logout);
router.post("/2fa/totp/setup", authenticate, setupTotp);
router.post("/2fa/totp/verify", authenticate, verifyTotpSetup);
router.post("/2fa/totp/disable", authenticate, disableTotp);

export default router;
