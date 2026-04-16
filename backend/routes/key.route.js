import express from "express";
import { ensureKeys, getKeyStatus, rotateKeys } from "../controllers/key.controller.js";

const router = express.Router();

router.post("/ensure", ensureKeys);
router.get("/status", getKeyStatus);
router.post("/rotate", rotateKeys);

export default router;
