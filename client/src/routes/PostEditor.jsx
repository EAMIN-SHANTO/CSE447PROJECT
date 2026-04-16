import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const MAX_IMAGES = 3;

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
    category: "general",
    biddingEndsAt: "",
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
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
          category: post.category || "general",
          biddingEndsAt: toInputDateTime(post.market?.biddingEndsAt),
        });
        setExistingImages(post.images || (post.img ? [post.img] : []));
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
      if (!isEdit && selectedImages.length < 1) {
        setError("Please upload at least 1 image");
        return;
      }

      const payload = new FormData();
      payload.append("slug", form.slug);
      payload.append("title", form.title);
      payload.append("desc", form.desc);
      payload.append("content", form.content);
      payload.append("category", form.category);

      if (form.biddingEndsAt) {
        payload.append("biddingEndsAt", new Date(form.biddingEndsAt).toISOString());
      }

      selectedImages.forEach((file) => {
        payload.append("images", file);
      });

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

  const onImageSelect = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length > MAX_IMAGES) {
      setError("Maximum 3 images are allowed");
      setSelectedImages(files.slice(0, MAX_IMAGES));
      return;
    }

    setError("");
    setSelectedImages(files);
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
          <label className="text-sm text-slate-600">
            Upload images (1 to 3)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onImageSelect}
              className="mt-1 w-full border border-slate-300 rounded-xl p-3"
            />
          </label>
          {isEdit && existingImages.length > 0 && selectedImages.length === 0 && (
            <p className="text-xs text-slate-500">No new upload selected. Existing images will be kept.</p>
          )}
          {selectedImages.length > 0 && (
            <p className="text-xs text-slate-500">Selected {selectedImages.length} image(s).</p>
          )}
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
