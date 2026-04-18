import express from "express";
import {
  createInquiryMessage,
  getConversationMessages,
  getInbox,
  replyToConversation,
} from "../controllers/message.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

router.get("/inbox", authenticate, getInbox);
router.get("/conversations/:conversationId", authenticate, getConversationMessages);
router.post("/conversations/:conversationId", authenticate, replyToConversation);
router.post("/inquiry/:postId", authenticate, createInquiryMessage);

export default router;
