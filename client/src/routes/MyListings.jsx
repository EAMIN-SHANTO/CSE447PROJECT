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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">Loading my listings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8">
        
        {/* Header Section */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-2">Inventory</p>
            <h1 className="text-3xl font-extrabold text-black">My Listings</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-lg">
              Manage your active listings, track bids, and securely complete transactions.
            </p>
          </div>
          <Link to="/posts/new" className="px-6 py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors shadow-sm whitespace-nowrap text-center">
            + Create New Listing
          </Link>
        </section>

        {error && (
          <div className="px-6 py-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm font-bold shadow-sm">
            {error}
          </div>
        )}

        {/* Filter Bar */}
        <section className="grid md:grid-cols-[1fr_auto_auto] gap-4 items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search my listings..."
            className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors shadow-sm"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-full md:w-48 bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors shadow-sm appearance-none font-semibold cursor-pointer"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="locked-first">Sort: Locked First</option>
            <option value="title-asc">Sort: Title A-Z</option>
            <option value="title-desc">Sort: Title Z-A</option>
          </select>
          <div className="px-5 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 shadow-sm whitespace-nowrap">
            Results: {myPosts.length}
          </div>
        </section>

        {/* Grid of Listings */}
        <div className="space-y-4">
          {myPosts.length === 0 && (
            <div className="p-12 bg-white rounded-2xl border border-gray-200 text-gray-500 font-bold text-center">
              No listings yet.
            </div>
          )}

          {paginatedPosts.map((post) => (
            <article key={post._id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md">
              
              {/* Left side: Info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h2 className="text-xl font-extrabold text-black truncate">{post.title}</h2>
                  <div className="flex gap-2">
                    <CryptoStatusBadge label="Encrypted" />
                    <CryptoStatusBadge label={post.crypto?.integrity === "verified" ? "Verified" : "Tamper Alert"} />
                    {post.market?.isLocked && <CryptoStatusBadge label="Locked" />}
                  </div>
                </div>
                
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                  slug: /{post.slug}
                </p>
                <p className="text-sm text-gray-600 line-clamp-2 max-w-3xl leading-relaxed">
                  {post.desc}
                </p>
              </div>

              {/* Right side: Actions */}
              <div className="flex flex-wrap md:flex-col md:items-end gap-3 shrink-0 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0 w-full md:w-auto">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Link 
                    to={`/posts/${post.slug}`} 
                    className="flex-1 md:flex-none text-center px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 hover:text-black transition-colors"
                  >
                    View
                  </Link>
                  {!post.market?.isLocked && (
                    <Link
                      to={`/posts/${post.slug}/edit`}
                      className="flex-1 md:flex-none text-center px-4 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors shadow-sm"
                    >
                      Edit
                    </Link>
                  )}
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  {post.market?.winningBid && (
                    <Link
                      to={`/transactions/${post.market.winningBid}`}
                      className="flex-1 md:flex-none text-center px-4 py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm font-bold hover:bg-green-100 hover:text-green-800 transition-colors"
                    >
                      Transaction
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(post._id)}
                    className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 hover:text-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Pagination */}
        {myPosts.length > 0 && (
          <div className="flex items-center justify-center gap-4 pt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-black text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:hover:bg-white shadow-sm"
            >
              Previous
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Page {Math.min(page, totalPages)} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-black text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:hover:bg-white shadow-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListings;
