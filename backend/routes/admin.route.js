import express from "express";
import { getAdminStatus } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/status", getAdminStatus);

export default router;
