import express from "express";
import { login, register, verifySecondFactor } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-2fa", verifySecondFactor);

export default router;
