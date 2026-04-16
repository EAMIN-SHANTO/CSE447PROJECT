import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CryptoStatusBadge from "../components/CryptoStatusBadge";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const MyListings = () => {
  const { profile, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const load = async () => {
    setLoading(true);

    try {
      const feed = await api.listPosts();
      setPosts(feed || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const myPosts = useMemo(() => {
    if (!profile?.pseudonym) {
      return [];
    }

    const mine = posts.filter((post) => post.seller?.pseudonym === profile.pseudonym);
    const normalized = query.trim().toLowerCase();

    const filtered = mine.filter((post) => {
      if (!normalized) {
        return true;
      }

      const haystack = [post.title, post.desc, post.slug, post.category].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalized);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sortBy === "title-asc") {
        return String(a.title || "").localeCompare(String(b.title || ""));
      }

      if (sortBy === "title-desc") {
        return String(b.title || "").localeCompare(String(a.title || ""));
      }

      if (sortBy === "locked-first") {
        return Number(Boolean(b.market?.isLocked)) - Number(Boolean(a.market?.isLocked));
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, profile?.pseudonym, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(myPosts.length / pageSize));
  const paginatedPosts = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return myPosts.slice(start, start + pageSize);
  }, [myPosts, page, pageSize, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, sortBy]);

  const handleDelete = async (postId) => {
    const confirmed = window.confirm("Delete this listing?");

    if (!confirmed) {
      return;
    }

    try {
      await api.deletePost(postId, token);
      await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to delete listing");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading my listings...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Listings</h1>
        <Link to="/posts/new" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">
          Create New
        </Link>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search my listings"
          className="border border-slate-300 rounded-xl p-2.5 text-sm"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="border border-slate-300 rounded-xl p-2.5 text-sm"
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="locked-first">Sort: Locked First</option>
          <option value="title-asc">Sort: Title A-Z</option>
          <option value="title-desc">Sort: Title Z-A</option>
        </select>
        <div className="text-sm text-slate-600 flex items-center">Results: {myPosts.length}</div>
      </div>

      <div className="grid gap-4">
        {myPosts.length === 0 && (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-slate-600">No listings yet.</div>
        )}

        {paginatedPosts.map((post) => (
          <article key={post._id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{post.title}</h2>
                <p className="text-sm text-slate-500">/{post.slug}</p>
              </div>
              <div className="flex gap-2">
                <CryptoStatusBadge label="Encrypted" />
                <CryptoStatusBadge label={post.crypto?.integrity === "verified" ? "Verified" : "Tamper Alert"} />
                {post.market?.isLocked && <CryptoStatusBadge label="Locked" />}
              </div>
            </div>

            <p className="text-sm text-slate-700 mt-3 line-clamp-2">{post.desc}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/posts/${post.slug}`} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                View
              </Link>
              {!post.market?.isLocked && (
                <Link
                  to={`/posts/${post.slug}/edit`}
                  className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold"
                >
                  Edit
                </Link>
              )}
              {post.market?.winningBid && (
                <Link
                  to={`/transactions/${post.market.winningBid}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold"
                >
                  Transaction
                </Link>
              )}
              <button
                type="button"
                onClick={() => handleDelete(post._id)}
                className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {myPosts.length > 0 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-700">
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MyListings;
