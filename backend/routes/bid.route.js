import express from "express";
import { createBid, listBids } from "../controllers/bid.controller.js";

const router = express.Router();

router.get("/", listBids);
router.post("/", createBid);

export default router;
