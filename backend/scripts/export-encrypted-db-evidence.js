import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Post from "../models/post.model.js";
import Bid from "../models/bid.model.js";
import Comment from "../models/comment.model.js";
import KeyMetadata from "../models/key-metadata.model.js";

dotenv.config();

const outputDir = path.resolve(process.cwd(), "docs/phase7/evidence");
const outputFile = path.join(outputDir, "encrypted-db-evidence.json");

const hasPlaintextLeak = (value) => {
  const text = JSON.stringify(value || {}).toLowerCase();
  const suspiciousTokens = ["title", "content", "desc", "offeramount", "contactinfo"];
  return suspiciousTokens.some((token) => text.includes(`\"${token}\":\"`) && !text.includes("ciphertext"));
};

const summarizePost = (post) => ({
  id: post._id,
  slug: post.slug,
  marketStatus: post.marketStatus,
  isLocked: post.isLocked,
  hasProtectedData: Boolean(post.protectedData && Object.keys(post.protectedData).length),
  hasRecordMac: Boolean(post.recordMac),
  encryptionMeta: post.encryptionMeta,
  sampleProtectedData: post.protectedData,
  plaintextLeakDetected: hasPlaintextLeak(post.protectedData),
});

const summarizeBid = (bid) => ({
  id: bid._id,
  status: bid.status,
  hasProtectedData: Boolean(bid.protectedData && Object.keys(bid.protectedData).length),
  hasRecordMac: Boolean(bid.recordMac),
  encryptionMeta: bid.encryptionMeta,
  hasMeetupProtectedData: Boolean(bid.transaction?.meetupProtectedData && Object.keys(bid.transaction.meetupProtectedData).length),
  sampleProtectedData: bid.protectedData,
  sampleMeetupProtectedData: bid.transaction?.meetupProtectedData || {},
  plaintextLeakDetected: hasPlaintextLeak(bid.protectedData),
});

const summarizeComment = (comment) => ({
  id: comment._id,
  hasProtectedData: Boolean(comment.protectedData && Object.keys(comment.protectedData).length),
  hasRecordMac: Boolean(comment.recordMac),
  encryptionMeta: comment.encryptionMeta,
  sampleProtectedData: comment.protectedData,
  plaintextLeakDetected: hasPlaintextLeak(comment.protectedData),
});

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required to export DB evidence");
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const [posts, bids, comments, keys] = await Promise.all([
      Post.find({ protectedData: { $exists: true } }).sort({ createdAt: -1 }).limit(3),
      Bid.find({ protectedData: { $exists: true } }).sort({ createdAt: -1 }).limit(3),
      Comment.find({ protectedData: { $exists: true } }).sort({ createdAt: -1 }).limit(3),
      KeyMetadata.find({}).sort({ createdAt: -1 }).limit(10),
    ]);

    const report = {
      generatedAt: new Date().toISOString(),
      counts: {
        postsWithProtectedData: posts.length,
        bidsWithProtectedData: bids.length,
        commentsWithProtectedData: comments.length,
        keyMetadataRecords: keys.length,
      },
      posts: posts.map(summarizePost),
      bids: bids.map(summarizeBid),
      comments: comments.map(summarizeComment),
      keys: keys.map((key) => ({
        keyId: key.keyId,
        ownerId: key.ownerId,
        domain: key.domain,
        algorithm: key.algorithm,
        version: key.version,
        status: key.status,
        hasPublicKey: Boolean(key.publicKey),
        hasPrivateKeyBackup: Boolean(key.privateKeyBackup?.cipherPayload),
        hasMacKeyBackup: Boolean(key.macKeyBackup?.cipherPayload),
      })),
    };

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(report, null, 2));

    console.log(`Encrypted DB evidence written to: ${outputFile}`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error("Failed to export encrypted DB evidence:", error.message);
  process.exit(1);
});
