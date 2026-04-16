import express from "express";
import { createComment, listComments } from "../controllers/comment.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

router.get("/post/:postId", listComments);
router.post("/", authenticate, createComment);

export default router;
