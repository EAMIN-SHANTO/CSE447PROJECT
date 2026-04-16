import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const toInputDateTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const PostEditor = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const isEdit = useMemo(() => Boolean(slug), [slug]);
  const { token } = useAuth();

  const [postId, setPostId] = useState("");
  const [form, setForm] = useState({
    slug: "",
    title: "",
    desc: "",
    content: "",
    img: "",
    category: "general",
    biddingEndsAt: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    const load = async () => {
      try {
        const post = await api.getPostBySlug(slug);
        setPostId(post._id);
        setForm({
          slug: post.slug || "",
          title: post.title || "",
          desc: post.desc || "",
          content: post.content || "",
          img: post.img || "",
          category: post.category || "general",
          biddingEndsAt: toInputDateTime(post.market?.biddingEndsAt),
        });
      } catch (requestError) {
        setError(requestError.message || "Failed to load listing");
      }
    };

    load();
  }, [isEdit, slug]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        biddingEndsAt: form.biddingEndsAt ? new Date(form.biddingEndsAt).toISOString() : undefined,
      };

      if (isEdit) {
        await api.updatePost(postId, payload, token);
        navigate(`/posts/${form.slug}`);
      } else {
        const created = await api.createPost(payload, token);
        navigate(`/posts/${created.slug}`);
      }
    } catch (requestError) {
      setError(requestError.message || "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          {isEdit ? "Edit Listing" : "Create Listing"}
        </h1>

        {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

        <form onSubmit={submit} className="grid gap-4">
          <input
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="Unique slug"
            className="border border-slate-300 rounded-xl p-3"
            required
            disabled={isEdit}
          />
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Listing title"
            className="border border-slate-300 rounded-xl p-3"
            required
          />
          <textarea
            value={form.desc}
            onChange={(event) => setForm((prev) => ({ ...prev, desc: event.target.value }))}
            placeholder="Short description"
            className="border border-slate-300 rounded-xl p-3 min-h-24"
          />
          <textarea
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            placeholder="Full details"
            className="border border-slate-300 rounded-xl p-3 min-h-40"
            required
          />
          <input
            value={form.img}
            onChange={(event) => setForm((prev) => ({ ...prev, img: event.target.value }))}
            placeholder="Image URL (optional)"
            className="border border-slate-300 rounded-xl p-3"
          />
          <input
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            placeholder="Category"
            className="border border-slate-300 rounded-xl p-3"
          />
          <label className="text-sm text-slate-600">
            Bidding Ends At
            <input
              type="datetime-local"
              value={form.biddingEndsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, biddingEndsAt: event.target.value }))}
              className="mt-1 w-full border border-slate-300 rounded-xl p-3"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Update Listing" : "Publish Listing"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostEditor;
