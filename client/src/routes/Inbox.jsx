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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8">
        
        {/* Header */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-2">Messaging</p>
          <h1 className="text-3xl font-extrabold text-black">Inbox</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-lg">
            Buyer-seller inquiry messages with encrypted and MAC-verified payloads.
          </p>
        </section>

        {statusMessage && (
          <div className="px-6 py-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm font-bold shadow-sm">
            {statusMessage}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Sidebar: Conversations List */}
          <section className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-[700px]">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="font-bold text-black text-lg">Conversations</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading && <p className="text-sm text-gray-500 p-4 font-bold">Loading inbox...</p>}
              {!loading && conversations.length === 0 && (
                <p className="text-sm text-gray-500 p-4 font-bold">No inquiry messages yet.</p>
              )}

              {conversations.map((item) => {
                const isActive = String(item.conversationId) === String(selectedId);
                return (
                  <button
                    key={item.conversationId}
                    type="button"
                    onClick={() => setSelectedId(String(item.conversationId))}
                    className={`w-full text-left rounded-xl p-4 transition-all duration-200 border ${
                      isActive
                        ? "border-black bg-black text-white shadow-md transform scale-[1.02]"
                        : "border-transparent hover:border-gray-200 hover:bg-gray-50 text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-bold truncate ${isActive ? "text-white" : "text-black"}`}>
                        @{item.counterpart?.pseudonym}
                      </p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                        {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${isActive ? "text-gray-300" : "text-gray-500"}`}>
                      {item.lastMessagePreview || "No messages yet"}
                    </p>
                    <div className={`mt-3 inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                      isActive 
                        ? "bg-white/20 text-white border-white/20" 
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>
                      {item.postSlug ? `Post: ${item.postSlug}` : "General"}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Main Chat Area */}
          <section className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col h-[700px] overflow-hidden">
            {!selectedId && (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Select a conversation</p>
              </div>
            )}

            {selectedId && (
              <>
                {/* Chat Header */}
                <div className="p-5 md:p-6 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Chatting with</p>
                    <p className="text-lg font-extrabold text-black">
                      @{selectedCounterpart?.pseudonym || selectedConversation?.seller?.pseudonym || "user"}
                    </p>
                  </div>
                  {selectedConversation?.postSlug && (
                    <Link 
                      to={`/posts/${selectedConversation.postSlug}`} 
                      className="px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-bold text-black hover:bg-gray-100 transition-colors whitespace-nowrap"
                    >
                      View Listing: {selectedConversation.postSlug}
                    </Link>
                  )}
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 bg-gray-50">
                  {loadingThread && <p className="text-sm text-gray-500 text-center py-4 font-bold">Loading messages...</p>}
                  {!loadingThread && messages.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4 font-bold tracking-wide">No messages in this conversation yet.</p>
                  )}

                  {messages.map((item) => {
                    const isMe = item.senderPseudonym === profile?.pseudonym;
                    return (
                      <article
                        key={item.id}
                        className={`max-w-[85%] md:max-w-[75%] flex flex-col ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                      >
                        <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">@{item.senderPseudonym}</span>
                          <span className="text-[10px] font-bold text-gray-400">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div 
                          className={`px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                            isMe
                              ? "bg-black text-white rounded-2xl rounded-tr-sm"
                              : "bg-white border border-gray-200 text-black rounded-2xl rounded-tl-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{item.content}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Chat Input */}
                <form onSubmit={sendReply} className="p-4 md:p-5 bg-white border-t border-gray-100 flex gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-8 py-3.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors shadow-sm"
                  >
                    Send
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
