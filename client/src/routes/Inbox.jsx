import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const Inbox = () => {
  const { token, profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");

    try {
      const response = await api.getInbox(token);
      const items = response.conversations || [];
      setConversations(items);

      if (!selectedId && items.length > 0) {
        setSelectedId(String(items[0].conversationId));
      }
    } catch (error) {
      setStatusMessage(error.message || "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, [selectedId, token]);

  const loadThread = useCallback(async () => {
    if (!selectedId) {
      setMessages([]);
      setSelectedConversation(null);
      return;
    }

    setLoadingThread(true);

    try {
      const response = await api.getConversationMessages(selectedId, token);
      setSelectedConversation(response.conversation || null);
      setMessages(response.messages || []);
    } catch (error) {
      setStatusMessage(error.message || "Failed to load conversation");
    } finally {
      setLoadingThread(false);
    }
  }, [selectedId, token]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const selectedCounterpart = useMemo(() => {
    const found = conversations.find((item) => String(item.conversationId) === String(selectedId));
    return found?.counterpart || null;
  }, [conversations, selectedId]);

  const sendReply = async (event) => {
    event.preventDefault();

    const content = replyText.trim();
    if (!selectedId || !content) {
      return;
    }

    try {
      await api.replyToConversation(selectedId, { content }, token);
      setReplyText("");
      await Promise.all([loadThread(), loadInbox()]);
    } catch (error) {
      setStatusMessage(error.message || "Failed to send message");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
        <p className="text-sm text-slate-600">Buyer-seller inquiry messages with encrypted and MAC-verified payloads.</p>
      </div>

      {statusMessage && <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">{statusMessage}</div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-slate-900 mb-3">Conversations</h2>

          {loading && <p className="text-sm text-slate-500">Loading inbox...</p>}
          {!loading && conversations.length === 0 && (
            <p className="text-sm text-slate-500">No inquiry messages yet.</p>
          )}

          <div className="space-y-2">
            {conversations.map((item) => (
              <button
                key={item.conversationId}
                type="button"
                onClick={() => setSelectedId(String(item.conversationId))}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  String(item.conversationId) === String(selectedId)
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-semibold text-slate-800">@{item.counterpart?.pseudonym}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{item.lastMessagePreview || "No messages yet"}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{item.postSlug ? `Post: ${item.postSlug}` : "General"}</span>
                  <span>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : ""}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col min-h-[520px]">
          {!selectedId && <p className="text-sm text-slate-500">Select a conversation.</p>}

          {selectedId && (
            <>
              <div className="pb-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    Chat with @{selectedCounterpart?.pseudonym || selectedConversation?.seller?.pseudonym || "user"}
                  </p>
                  {selectedConversation?.postSlug && (
                    <Link to={`/posts/${selectedConversation.postSlug}`} className="text-xs text-indigo-700 hover:text-indigo-900">
                      Open listing: {selectedConversation.postSlug}
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex-1 py-4 space-y-3 overflow-y-auto">
                {loadingThread && <p className="text-sm text-slate-500">Loading messages...</p>}
                {!loadingThread && messages.length === 0 && (
                  <p className="text-sm text-slate-500">No messages in this conversation yet.</p>
                )}

                {messages.map((item) => {
                  const isMe = item.senderPseudonym === profile?.pseudonym;
                  return (
                    <article
                      key={item.id}
                      className={`max-w-[80%] rounded-xl px-3 py-2 border text-sm ${
                        isMe
                          ? "ml-auto bg-emerald-50 border-emerald-200 text-emerald-900"
                          : "mr-auto bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <p className="text-[11px] mb-1 opacity-70">@{item.senderPseudonym}</p>
                      <p className="whitespace-pre-wrap">{item.content}</p>
                      <p className="text-[10px] opacity-60 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                    </article>
                  );
                })}
              </div>

              <form onSubmit={sendReply} className="pt-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Write your message"
                  className="flex-1 border border-slate-300 rounded-xl p-3 text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Inbox;
