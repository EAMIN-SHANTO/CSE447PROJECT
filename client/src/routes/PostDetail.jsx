import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CryptoStatusBadge from "../components/CryptoStatusBadge";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const PostDetail = () => {
  const { slug } = useParams();
  const { token, profile } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [bidInput, setBidInput] = useState({ offerAmount: "", note: "" });
  const [meetupInput, setMeetupInput] = useState({ meetupLocation: "", meetupTime: "", meetupNote: "" });
  const [actionMessage, setActionMessage] = useState("");

  const isSeller = useMemo(
    () => Boolean(profile?.pseudonym && post?.seller?.pseudonym === profile.pseudonym),
    [profile?.pseudonym, post?.seller?.pseudonym]
  );

  const isLocked = Boolean(post?.market?.isLocked);

  const loadPostData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const postData = await api.getPostBySlug(slug);
      setPost(postData);

      if (postData?._id) {
        const commentData = await api.listCommentsByPost(postData._id);
        setComments(commentData.comments || []);

        if (token) {
          try {
            const bidData = await api.listBidsByPost(postData._id, token);
            setBids(bidData.bids || []);
          } catch {
            setBids([]);
          }
        }
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to load listing");
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  useEffect(() => {
    loadPostData();
  }, [loadPostData]);

  const handleCommentSubmit = async (event) => {
    event.preventDefault();

    if (!post?._id || !commentInput.trim()) {
      return;
    }

    try {
      await api.createComment({ postId: post._id, content: commentInput.trim() }, token);
      setCommentInput("");
      setActionMessage("Comment posted securely.");
      await loadPostData();
    } catch (requestError) {
      setActionMessage(requestError.message || "Could not post comment");
    }
  };

  const handleBidSubmit = async (event) => {
    event.preventDefault();

    if (!post?._id || !bidInput.offerAmount) {
      return;
    }

    try {
      await api.createBid(
        {
          postId: post._id,
          offerAmount: bidInput.offerAmount,
          note: bidInput.note,
        },
        token
      );
      setBidInput({ offerAmount: "", note: "" });
      setActionMessage("Bid submitted with encrypted payload.");
      await loadPostData();
    } catch (requestError) {
      setActionMessage(requestError.message || "Could not submit bid");
    }
  };

  const handleAcceptBid = async (bidId) => {
    if (!meetupInput.meetupLocation || !meetupInput.meetupTime) {
      setActionMessage("Meetup location and time are required.");
      return;
    }

    try {
      const response = await api.acceptBid(bidId, meetupInput, token);
      setActionMessage(
        `Bid accepted. Exchange code: ${response?.transactionPackage?.exchangeCode || "generated"}`
      );
      await loadPostData();
    } catch (requestError) {
      setActionMessage(requestError.message || "Could not accept bid");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading secure listing...</div>;
  }

  if (error || !post) {
    return <div className="p-8 text-center text-rose-600">{error || "Listing not found"}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{post.title}</h1>
            <p className="text-sm text-slate-500 mt-1">Seller: @{post.seller?.pseudonym}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CryptoStatusBadge label="Encrypted" />
            <CryptoStatusBadge label={post.crypto?.integrity === "verified" ? "Verified" : "Tamper Alert"} />
            {isLocked && <CryptoStatusBadge label="Locked" />}
          </div>
        </div>

        <p className="text-slate-700 mb-4">{post.desc}</p>
        <p className="text-slate-800 whitespace-pre-wrap">{post.content}</p>

        <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-slate-500">Category</p>
            <p className="font-semibold text-slate-800">{post.category}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-slate-500">Bidding Ends</p>
            <p className="font-semibold text-slate-800">{new Date(post.market?.biddingEndsAt).toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-slate-500">Trust Badge</p>
            <p className="font-semibold text-slate-800">
              {post.seller?.trust?.verifiedCampusBadge ? "Verified Campus" : "Unverified"}
            </p>
          </div>
        </div>

        {isSeller && post.market?.status === "open" && (
          <div className="mt-6">
            <Link
              to={`/posts/${post.slug}/edit`}
              className="inline-flex px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium"
            >
              Edit Listing
            </Link>
          </div>
        )}
      </section>

      {actionMessage && <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">{actionMessage}</div>}

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Comments</h2>

          {!isLocked && token && (
            <form onSubmit={handleCommentSubmit} className="space-y-3 mb-5">
              <textarea
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="Write an encrypted comment"
                className="w-full border border-slate-300 rounded-xl p-3 min-h-24"
              />
              <button className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium" type="submit">
                Post Comment
              </button>
            </form>
          )}

          <div className="space-y-3">
            {comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
            {comments.map((comment) => (
              <article key={comment._id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500 mb-1">@{comment.author?.pseudonym}</p>
                <p className="text-sm text-slate-800">{comment.content}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Bids</h2>

          {!isLocked && token && !isSeller && (
            <form onSubmit={handleBidSubmit} className="space-y-3 mb-5">
              <input
                type="number"
                value={bidInput.offerAmount}
                onChange={(event) => setBidInput((prev) => ({ ...prev, offerAmount: event.target.value }))}
                placeholder="Offer amount"
                className="w-full border border-slate-300 rounded-xl p-3"
              />
              <input
                type="text"
                value={bidInput.note}
                onChange={(event) => setBidInput((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Optional note"
                className="w-full border border-slate-300 rounded-xl p-3"
              />
              <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium" type="submit">
                Submit Bid
              </button>
            </form>
          )}

          {isSeller && post.market?.status === "open" && (
            <div className="grid md:grid-cols-3 gap-3 mb-5">
              <input
                value={meetupInput.meetupLocation}
                onChange={(event) => setMeetupInput((prev) => ({ ...prev, meetupLocation: event.target.value }))}
                placeholder="Meetup location"
                className="border border-slate-300 rounded-xl p-3"
              />
              <input
                value={meetupInput.meetupTime}
                onChange={(event) => setMeetupInput((prev) => ({ ...prev, meetupTime: event.target.value }))}
                placeholder="Meetup time"
                className="border border-slate-300 rounded-xl p-3"
              />
              <input
                value={meetupInput.meetupNote}
                onChange={(event) => setMeetupInput((prev) => ({ ...prev, meetupNote: event.target.value }))}
                placeholder="Meetup note"
                className="border border-slate-300 rounded-xl p-3"
              />
            </div>
          )}

          <div className="space-y-3">
            {bids.length === 0 && <p className="text-sm text-slate-500">No bids visible.</p>}
            {bids.map((bid) => {
              const canGoTransaction =
                bid.status !== "pending" &&
                profile &&
                [bid.seller?.pseudonym, bid.bidder?.pseudonym].includes(profile.pseudonym);

              return (
                <article key={bid._id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <p className="text-slate-500">Bidder @{bid.bidder?.pseudonym}</p>
                    <p className="font-semibold text-slate-900">BDT {bid.offerAmount}</p>
                  </div>
                  <p className="text-sm text-slate-700">{bid.note}</p>
                  <p className="text-xs text-slate-500">Status: {bid.status}</p>

                  <div className="flex gap-2">
                    {isSeller && bid.status === "pending" && post.market?.status === "open" && (
                      <button
                        onClick={() => handleAcceptBid(bid._id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                      >
                        Accept & Lock
                      </button>
                    )}

                    {canGoTransaction && (
                      <Link
                        to={`/transactions/${bid._id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold"
                      >
                        Transaction
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PostDetail;
