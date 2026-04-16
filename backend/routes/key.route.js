import express from "express";
import { ensureKeys, getKeyStatus, rotateKeys } from "../controllers/key.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorize-role.js";

const router = express.Router();

router.post("/ensure", authenticate, authorizeRole("admin"), ensureKeys);
router.get("/status", authenticate, authorizeRole("admin"), getKeyStatus);
router.post("/rotate", authenticate, authorizeRole("admin"), rotateKeys);

export default router;
