import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import CryptoStatusBadge from "../components/CryptoStatusBadge";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const TransactionConfirmation = () => {
  const { bidId } = useParams();
  const { token, profile } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ outcome: "completed", exchangeCode: "", note: "" });
  const [ratingForm, setRatingForm] = useState({ score: "5", note: "" });
  const [message, setMessage] = useState("");
  const [storedExchangeCode, setStoredExchangeCode] = useState("");
  const [storedExchangeExpiresAt, setStoredExchangeExpiresAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.getTransaction(bidId, token);
      setData(response);
    } catch (requestError) {
      setError(requestError.message || "Failed to fetch transaction");
    } finally {
      setLoading(false);
    }
  }, [bidId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const actorRole = data?.actorRoleInTransaction || "";
  const showExchangeCodeInput = useMemo(
    () => actorRole === "buyer" && form.outcome === "completed",
    [actorRole, form.outcome]
  );

  const submit = async (event) => {
    event.preventDefault();

    try {
      const payload = {
        outcome: form.outcome,
        note: form.note,
      };

      if (showExchangeCodeInput) {
        payload.exchangeCode = form.exchangeCode;
      }

      const response = await api.confirmTransaction(bidId, payload, token);
      setMessage(response.message || "Confirmation sent");
      await load();
    } catch (requestError) {
      setMessage(requestError.message || "Failed to submit confirmation");
    }
  };

  const submitSellerRating = async (event) => {
    event.preventDefault();

    try {
      const response = await api.rateSeller(
        bidId,
        {
          score: Number(ratingForm.score),
          note: ratingForm.note,
        },
        token
      );
      setMessage(response.message || "Seller rating submitted.");
      setRatingForm({ score: "5", note: "" });
      await load();
    } catch (requestError) {
      setMessage(requestError.message || "Failed to submit seller rating");
    }
  };

  useEffect(() => {
    if (!bidId || actorRole !== "seller") {
      return;
    }

    const raw = localStorage.getItem(`exchange_code_${bidId}`);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setStoredExchangeCode(parsed.exchangeCode || "");
      setStoredExchangeExpiresAt(parsed.expiresAt || "");
    } catch {
      // Ignore invalid local storage payload.
    }
  }, [bidId, actorRole]);

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading transaction...</div>;
  }

  if (error || !data?.bid) {
    return <div className="p-8 text-center text-rose-600">{error || "Transaction not found"}</div>;
  }

  const bid = data.bid;
  const isConfirmableStatus = ["accepted", "disputed"].includes(bid.status);
  const actorConfirmationStatus = actorRole ? bid.transaction?.confirmations?.[actorRole]?.status : "pending";
  const alreadyConfirmed = actorRole && actorConfirmationStatus && actorConfirmationStatus !== "pending";
  const canSubmitConfirmation = isConfirmableStatus && !alreadyConfirmed;
  const hasSellerBeenRated = Boolean(bid.transaction?.buyerToSellerRating?.score);
  const canBuyerRateSeller = actorRole === "buyer" && bid.status === "completed" && !hasSellerBeenRated;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transaction Confirmation</h1>
            <p className="text-sm text-slate-500 mt-1">Bid ID: {bid._id}</p>
          </div>
          <div className="flex gap-2">
            <CryptoStatusBadge label="Encrypted" />
            <CryptoStatusBadge label="Verified" />
            {bid.status !== "pending" && <CryptoStatusBadge label="Locked" />}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-slate-500">Seller</p>
            <div className="mt-1 flex items-center gap-2">
              <UserAvatar name={bid.seller?.pseudonym} size="sm" />
              <p className="font-semibold text-slate-900">@{bid.seller?.pseudonym}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-slate-500">Buyer</p>
            <div className="mt-1 flex items-center gap-2">
              <UserAvatar name={bid.bidder?.pseudonym} size="sm" />
              <p className="font-semibold text-slate-900">@{bid.bidder?.pseudonym}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-slate-500">Offer Amount</p>
            <p className="font-semibold text-slate-900">BDT {bid.offerAmount}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-slate-500">Bid Status</p>
            <p className="font-semibold text-slate-900">{bid.status}</p>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-indigo-50 text-sm text-indigo-700 space-y-1">
          <p>Meetup: {bid.transaction?.meetup?.meetupLocation || "N/A"}</p>
          <p>Time: {bid.transaction?.meetup?.meetupTime || "N/A"}</p>
          <p>Note: {bid.transaction?.meetup?.meetupNote || "N/A"}</p>
          <p>
            Exchange Code Expires: {bid.transaction?.exchangeCode?.expiresAt
              ? new Date(bid.transaction.exchangeCode.expiresAt).toLocaleString()
              : "N/A"}
          </p>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Confirm Offline Handoff</h2>

        {!isConfirmableStatus && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">
            This bid is currently <strong>{bid.status}</strong>. Handoff confirmation is only available for accepted/disputed bids.
          </div>
        )}

        {isConfirmableStatus && alreadyConfirmed && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
            You already submitted your confirmation as <strong>{actorConfirmationStatus}</strong>.
          </div>
        )}

        {actorRole === "seller" && storedExchangeCode && (
          <div className="mb-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900">
            <p className="text-sm font-semibold">Your Exchange Code (share with buyer in-person)</p>
            <p className="mt-2 text-2xl tracking-[0.2em] font-bold">{storedExchangeCode}</p>
            <p className="text-xs mt-1">
              Expires: {storedExchangeExpiresAt ? new Date(storedExchangeExpiresAt).toLocaleString() : "N/A"}
            </p>
            <button
              type="button"
              className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(storedExchangeCode);
                  setMessage("Exchange code copied.");
                } catch {
                  setMessage("Could not copy exchange code. Please copy manually.");
                }
              }}
            >
              Copy Code
            </button>
          </div>
        )}

        {actorRole === "buyer" && (
          <div className="mb-4 p-3 rounded-lg bg-indigo-50 text-indigo-700 text-sm">
            Ask the seller for the exchange code at handoff, then enter it below when selecting Completed.
          </div>
        )}

        {message && <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">{message}</div>}

        <form onSubmit={submit} className="space-y-3">
          <select
            value={form.outcome}
            onChange={(event) => setForm((prev) => ({ ...prev, outcome: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            disabled={!canSubmitConfirmation}
          >
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          {showExchangeCodeInput && (
            <input
              value={form.exchangeCode}
              onChange={(event) => setForm((prev) => ({ ...prev, exchangeCode: event.target.value }))}
              className="w-full border border-slate-300 rounded-xl p-3"
              placeholder="Enter one-time exchange code"
              disabled={!canSubmitConfirmation}
              required
            />
          )}

          <textarea
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3 min-h-24"
            placeholder="Optional note for audit trail"
            disabled={!canSubmitConfirmation}
          />

          <button
            type="submit"
            disabled={!canSubmitConfirmation}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
          >
            Submit Confirmation
          </button>
        </form>

        <div className="mt-5 text-sm text-slate-600">
          <p>
            Seller status: <strong>{bid.transaction?.confirmations?.seller?.status || "pending"}</strong>
          </p>
          <p>
            Buyer status: <strong>{bid.transaction?.confirmations?.buyer?.status || "pending"}</strong>
          </p>
          <p>
            Dispute status: <strong>{bid.transaction?.disputeStatus || "none"}</strong>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <UserAvatar name={profile?.pseudonym} size="xs" />
            <p>Logged in as @{profile?.pseudonym} ({actorRole || "viewer"}).</p>
          </div>
        </div>

        {(canBuyerRateSeller || hasSellerBeenRated) && (
          <div className="mt-6 pt-5 border-t border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Rate Seller</h3>
            <p className="text-sm text-slate-600 mt-1">
              Buyer can submit a one-time rating after successful completion.
            </p>

            {hasSellerBeenRated && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
                You rated this seller{" "}
                <strong>{bid.transaction?.buyerToSellerRating?.score}/5</strong>
                {bid.transaction?.buyerToSellerRating?.note
                  ? ` — ${bid.transaction.buyerToSellerRating.note}`
                  : ""}
              </div>
            )}

            {canBuyerRateSeller && (
              <form onSubmit={submitSellerRating} className="mt-4 space-y-3 max-w-xl">
                <select
                  value={ratingForm.score}
                  onChange={(event) => setRatingForm((prev) => ({ ...prev, score: event.target.value }))}
                  className="w-full border border-slate-300 rounded-xl p-3"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Average</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Very Poor</option>
                </select>
                <textarea
                  value={ratingForm.note}
                  onChange={(event) => setRatingForm((prev) => ({ ...prev, note: event.target.value }))}
                  className="w-full border border-slate-300 rounded-xl p-3 min-h-20"
                  placeholder="Optional rating note"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
                >
                  Submit Rating
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default TransactionConfirmation;
