import mongoose from "mongoose";
import Post from "../models/post.model.js";
import { openPostFields } from "../controllers/post.controller.js";

async function test() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cse447");
  console.time("fetch");
  const posts = await Post.find().limit(5);
  console.timeEnd("fetch");
  
  console.log(`found ${posts.length} posts`);
  
  // Note: we can't easily import openPostFields because it's not exported.
  // Instead, let's just make a mock request to the local server if it's running.
}

test().catch(console.error).finally(() => process.exit());
