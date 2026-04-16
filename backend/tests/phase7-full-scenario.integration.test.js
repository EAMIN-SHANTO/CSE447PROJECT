import assert from "node:assert/strict";
import test from "node:test";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.PHASE7_BASE_URL || "http://127.0.0.1:3000";

const request = async (path, { method = "GET", body, token, cookie } = {}) => {
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  return { response, payload };
};

const registerAndLogin = async (prefix) => {
  const unique = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const pseudonym = unique.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 24);
  const email = `${unique}@g.bracu.ac.bd`;
  const password = "SecurePass123!";

  const registerResult = await request("/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      pseudonym,
      fullName: `${prefix} User`,
      contactInfo: "01700000000",
    },
  });
  assert.equal(registerResult.response.status, 201);

  const loginResult = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(loginResult.response.status, 200);

  const verifyResult = await request("/auth/verify-2fa", {
    method: "POST",
    body: {
      email,
      challengeId: loginResult.payload.challengeId,
      otp: loginResult.payload.devOtp,
    },
  });
  assert.equal(verifyResult.response.status, 200);

  return {
    email,
    pseudonym,
    token: verifyResult.payload.accessToken,
  };
};

const createPost = async ({ sellerToken, slug }) => {
  const postResult = await request("/posts", {
    method: "POST",
    token: sellerToken,
    body: {
      slug,
      title: `Item ${slug}`,
      desc: "Phase7 listing",
      content: "Secure product details",
      category: "electronics",
      biddingEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    },
  });

  assert.equal(postResult.response.status, 201);
  return postResult.payload;
};

test("phase7: full scenario flow and dispute branch", async () => {
  const seller = await registerAndLogin("phase7seller");
  const buyer = await registerAndLogin("phase7buyer");

  const primarySlug = `phase7-primary-${Date.now()}`;
  const post = await createPost({ sellerToken: seller.token, slug: primarySlug });

  const bidCreate = await request("/bids", {
    method: "POST",
    token: buyer.token,
    body: {
      postId: post._id,
      offerAmount: 5000,
      note: "I can buy today",
    },
  });

  assert.equal(bidCreate.response.status, 201);

  const sellerBidList = await request(`/bids/post/${post._id}`, { token: seller.token });
  assert.equal(sellerBidList.response.status, 200);
  assert.ok(sellerBidList.payload.bids.length >= 1);

  const bidId = sellerBidList.payload.bids[0]._id;

  const acceptBid = await request(`/bids/${bidId}/accept`, {
    method: "POST",
    token: seller.token,
    body: {
      meetupLocation: "BRACU Gate 1",
      meetupTime: "Tomorrow 11 AM",
      meetupNote: "Bring student ID",
    },
  });

  assert.equal(acceptBid.response.status, 200);
  assert.ok(acceptBid.payload.transactionPackage.exchangeCode);

  const postAfterLock = await request(`/posts/${primarySlug}`);
  assert.equal(postAfterLock.response.status, 200);
  assert.equal(postAfterLock.payload.market.isLocked, true);

  const commentAfterLock = await request("/comments", {
    method: "POST",
    token: buyer.token,
    body: { postId: post._id, content: "Can I still comment?" },
  });
  assert.equal(commentAfterLock.response.status, 409);

  const bidAfterLock = await request("/bids", {
    method: "POST",
    token: buyer.token,
    body: {
      postId: post._id,
      offerAmount: 5200,
      note: "Late bid",
    },
  });
  assert.equal(bidAfterLock.response.status, 409);

  const buyerConfirm = await request(`/bids/${bidId}/confirm`, {
    method: "POST",
    token: buyer.token,
    body: {
      outcome: "completed",
      exchangeCode: acceptBid.payload.transactionPackage.exchangeCode,
      note: "Item received",
    },
  });
  assert.equal(buyerConfirm.response.status, 200);

  const sellerConfirm = await request(`/bids/${bidId}/confirm`, {
    method: "POST",
    token: seller.token,
    body: {
      outcome: "completed",
      note: "Payment received",
    },
  });
  assert.equal(sellerConfirm.response.status, 200);

  const finalTransaction = await request(`/bids/${bidId}/transaction`, { token: seller.token });
  assert.equal(finalTransaction.response.status, 200);
  assert.equal(finalTransaction.payload.bid.status, "completed");

  const secondarySlug = `phase7-dispute-${Date.now()}`;
  const disputePost = await createPost({ sellerToken: seller.token, slug: secondarySlug });

  const disputeBidCreate = await request("/bids", {
    method: "POST",
    token: buyer.token,
    body: {
      postId: disputePost._id,
      offerAmount: 7000,
      note: "Dispute test",
    },
  });
  assert.equal(disputeBidCreate.response.status, 201);

  const disputeBidList = await request(`/bids/post/${disputePost._id}`, { token: seller.token });
  assert.equal(disputeBidList.response.status, 200);

  const disputeBidId = disputeBidList.payload.bids[0]._id;

  const disputeAccept = await request(`/bids/${disputeBidId}/accept`, {
    method: "POST",
    token: seller.token,
    body: {
      meetupLocation: "BRACU Cafeteria",
      meetupTime: "Tomorrow 3 PM",
      meetupNote: "Dispute branch",
    },
  });
  assert.equal(disputeAccept.response.status, 200);

  const buyerFailedConfirm = await request(`/bids/${disputeBidId}/confirm`, {
    method: "POST",
    token: buyer.token,
    body: {
      outcome: "failed",
      note: "Code mismatch",
    },
  });
  assert.equal(buyerFailedConfirm.response.status, 200);

  const sellerCompleteConfirm = await request(`/bids/${disputeBidId}/confirm`, {
    method: "POST",
    token: seller.token,
    body: {
      outcome: "completed",
      note: "Seller says completed",
    },
  });

  assert.equal(sellerCompleteConfirm.response.status, 200);
  assert.ok(sellerCompleteConfirm.payload.disputeId);
});
