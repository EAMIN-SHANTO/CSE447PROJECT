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
    <div className="min-h-screen bg-gray-50 py-10 md:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-2">
            {isEdit ? "Inventory Management" : "New Offering"}
          </p>
          <h1 className="text-3xl font-extrabold text-black">
            {isEdit ? "Edit Listing" : "Create Listing"}
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-lg">
            {isEdit 
              ? "Update your existing marketplace offering." 
              : "Launch a new secure listing with encrypted integrity checks."}
          </p>
        </section>

        {error && (
          <div className="px-6 py-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm font-bold shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
                Custom Product URL
              </label>
              <input
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="e.g. macbook-pro-m2"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={isEdit}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
                Listing Title
              </label>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Enter a descriptive title"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
              Short Description
            </label>
            <textarea
              value={form.desc}
              onChange={(event) => setForm((prev) => ({ ...prev, desc: event.target.value }))}
              placeholder="A brief summary of your item..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
              Full Details
            </label>
            <textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="Provide comprehensive details, specs, and conditions..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors min-h-[160px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
                Category
              </label>
              <input
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="e.g. Electronics, Books"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
                Bidding Ends At
              </label>
              <input
                type="datetime-local"
                value={form.biddingEndsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, biddingEndsAt: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
              />
            </div>
          </div>

          <div className="p-5 border border-gray-200 bg-gray-50 rounded-xl space-y-3">
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-widest">
              Upload Images
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onImageSelect}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-white file:border-gray-200 file:border file:text-black hover:file:bg-gray-100 transition-colors"
            />
            {isEdit && existingImages.length > 0 && selectedImages.length === 0 && (
              <p className="text-xs font-bold text-gray-500 mt-2">No new upload selected. Existing images will be preserved.</p>
            )}
            {selectedImages.length > 0 && (
              <p className="text-xs font-bold text-green-600 mt-2">Selected {selectedImages.length} image(s).</p>
            )}
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Maximum 3 images allowed</p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-6 py-4 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60 shadow-sm"
            >
              {saving ? "Processing..." : isEdit ? "Update Listing" : "Publish Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostEditor;
