import express from "express";
import {
	acceptBid,
	confirmBidHandoff,
	createBid,
	getBidTransactionPackage,
	listBidsByPost,
} from "../controllers/bid.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

router.get("/post/:postId", authenticate, listBidsByPost);
router.post("/", authenticate, createBid);
router.post("/:bidId/accept", authenticate, acceptBid);
router.get("/:bidId/transaction", authenticate, getBidTransactionPackage);
router.post("/:bidId/confirm", authenticate, confirmBidHandoff);

export default router;
