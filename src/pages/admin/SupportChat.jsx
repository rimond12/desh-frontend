import { useState, useEffect, useRef } from "react";
import Layout from "../../components/shared/Layout.jsx";
import toast from "react-hot-toast";
import useAxiosSecure from "../../hooks/useAxiosSecure.jsx";

export default function SupportChat() {
    const axiosSecure = useAxiosSecure();
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null);
    const [inputText, setInputText] = useState("");
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const fetchSessions = async (silent = false) => {
        if (!silent) setLoadingSessions(true);
        try {
            const res = await axiosSecure.get("/chatbot/admin/sessions");
            setSessions(res.data.sessions || []);
        } catch (err) {
            console.error("Error fetching support sessions:", err);
            if (!silent) toast.error("Failed to load support chats");
        } finally {
            if (!silent) setLoadingSessions(false);
        }
    };

    const fetchActiveSession = async (id, silent = false) => {
        try {
            const res = await axiosSecure.get(`/chatbot/session/${id}`);
            if (res.data.success) {
                setSelectedSession(res.data.session);
            }
        } catch (err) {
            console.error("Error fetching session detail:", err);
            if (!silent) toast.error("Failed to load conversation details");
        }
    };

    // Initial load
    useEffect(() => {
        fetchSessions();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Reload active session details when selection changes
    useEffect(() => {
        if (selectedSessionId) {
            fetchActiveSession(selectedSessionId);
        } else {
            setSelectedSession(null);
        }
    }, [selectedSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Background polling for sessions list and currently opened session
    useEffect(() => {
        const interval = setInterval(() => {
            fetchSessions(true);
            if (selectedSessionId) {
                fetchActiveSession(selectedSessionId, true);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll chat log to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedSession?.messages]);

    const handleTakeover = async () => {
        if (!selectedSessionId) return;
        try {
            const res = await axiosSecure.post(`/chatbot/admin/session/${selectedSessionId}/takeover`);
            if (res.data.success) {
                toast.success("You have taken over this chat");
                fetchSessions(true);
                fetchActiveSession(selectedSessionId);
            }
        } catch (err) {
            console.error(err);
            toast.error("Takeover failed");
        }
    };

    const handleCloseSession = async () => {
        if (!selectedSessionId) return;
        if (!window.confirm("Are you sure you want to close this support session?")) return;
        try {
            const res = await axiosSecure.post(`/chatbot/admin/session/${selectedSessionId}/close`);
            if (res.data.success) {
                toast.success("Support session closed");
                fetchSessions(true);
                fetchActiveSession(selectedSessionId);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to close session");
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedSessionId || sending) return;

        setSending(true);
        const text = inputText;
        setInputText("");

        try {
            const res = await axiosSecure.post(`/chatbot/admin/session/${selectedSessionId}/message`, { text });
            if (res.data.success) {
                setSelectedSession(res.data.session);
                fetchSessions(true);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to send message");
            setInputText(text); // restore typed text on error
        } finally {
            setSending(false);
        }
    };

    const activeSessionDetail = selectedSession;

    return (
        <Layout isAdmin={true}>
            <div className="fade-in-up flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
                {/* Header */}
                <div className="mb-4 flex-shrink-0">
                    <h1 className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                        💬 Support Takeover Center
                    </h1>
                    <p className="text-xs text-white/50 mt-1">
                        Take over live chats, collect user details, and support DESH users in real-time.
                    </p>
                </div>

                {/* Dashboard layout */}
                <div className="flex-1 flex gap-5 overflow-hidden w-full">
                    {/* Left Pane: Sessions List */}
                    <div className="w-80 flex flex-col glass-card overflow-hidden flex-shrink-0">
                        <div className="px-4 py-3 bg-black/15 border-b border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                                Support Queue ({sessions.length})
                            </span>
                            <button
                                onClick={() => fetchSessions()}
                                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                            {loadingSessions ? (
                                <div className="text-center py-10 text-white/30 text-xs italic">Loading support queue...</div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-20 text-white/30">
                                    <p className="text-2xl mb-1">📭</p>
                                    <p className="text-xs">Queue is empty</p>
                                </div>
                            ) : (
                                sessions.map((sess) => {
                                    const isSelected = sess._id === selectedSessionId;
                                    const lastMsg = sess.messages?.[sess.messages.length - 1]?.text || "";
                                    const timestamp = sess.updatedAt
                                        ? new Date(sess.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                        : "";
                                    
                                    return (
                                        <button
                                            key={sess._id}
                                            onClick={() => setSelectedSessionId(sess._id)}
                                            className={`w-full text-left px-4 py-3.5 transition-all flex flex-col gap-1 hover:bg-white/5 cursor-pointer border-l-4 ${
                                                isSelected
                                                    ? "bg-white/5 border-emerald-500"
                                                    : sess.status === "human_requested"
                                                    ? "border-amber-500 bg-amber-500/5"
                                                    : "border-transparent"
                                            }`}
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <span className="font-bold text-xs text-white truncate max-w-[130px]">
                                                    {sess.name || "Guest User"}
                                                </span>
                                                <span className="text-[9px] text-white/30 font-semibold">
                                                    {timestamp}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-white/60 truncate w-full">
                                                {lastMsg}
                                            </p>
                                            <div className="flex justify-between items-center w-full mt-1">
                                                <span className="text-[9px] text-white/40 truncate max-w-[120px]">
                                                    {sess.email || sess.phone || "No details"}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${
                                                    sess.status === "human_requested"
                                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                        : sess.status === "human_active"
                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                        : "bg-white/5 text-white/30 border border-white/10"
                                                }`}>
                                                    {sess.status === "human_requested" ? "Transfer" : sess.status === "human_active" ? "Active" : "Closed"}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Conversation Details */}
                    <div className="flex-1 flex flex-col glass-card overflow-hidden">
                        {activeSessionDetail ? (
                            <div className="flex-1 flex flex-col overflow-hidden h-full">
                                {/* Session Header */}
                                <div className="px-5 py-4 bg-black/15 border-b border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 flex-shrink-0">
                                    <div>
                                        <h3 className="font-bold text-sm text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                                            {activeSessionDetail.name || "Guest Chat Session"}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-white/50">
                                            {activeSessionDetail.email && (
                                                <span>
                                                    <strong>Email:</strong> {activeSessionDetail.email}
                                                </span>
                                            )}
                                            {activeSessionDetail.phone && (
                                                <span>
                                                    <strong>Phone:</strong> {activeSessionDetail.phone}
                                                </span>
                                            )}
                                            <span>
                                                <strong>Status:</strong>{" "}
                                                <span className={activeSessionDetail.status === "human_active" ? "text-emerald-400" : "text-amber-400"}>
                                                    {activeSessionDetail.status === "human_active" ? "Connected" : "Waiting for Takeover"}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {activeSessionDetail.status === "human_requested" && (
                                            <button
                                                onClick={handleTakeover}
                                                className="btn-primary-green text-[11px] font-bold px-4 py-2 rounded-xl cursor-pointer"
                                            >
                                                Take Over Chat
                                            </button>
                                        )}
                                        {activeSessionDetail.status === "human_active" && (
                                            <button
                                                onClick={handleCloseSession}
                                                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] cursor-pointer transition-all"
                                            >
                                                Close Support
                                            </button>
                                        )}
                                        {activeSessionDetail.status === "closed" && (
                                            <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg border border-white/5 bg-white/5">
                                                Session Closed
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Messages History */}
                                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin bg-black/5">
                                    {activeSessionDetail.messages?.map((msg, i) => {
                                        const isAdmin = msg.sender === "admin";
                                        const isBot = msg.sender === "bot";
                                        return (
                                            <div key={i} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                                                <span className="text-[10px] text-white/30 font-semibold mb-1 px-1">
                                                    {isAdmin ? `You (${msg.senderName})` : isBot ? "DESH Ai" : (activeSessionDetail.name || "User")}
                                                </span>
                                                <div
                                                    className="px-4 py-2.5 rounded-2xl text-xs max-w-[70%] leading-relaxed break-words"
                                                    style={{
                                                        background: isAdmin
                                                            ? "linear-gradient(135deg, #145C28, #2a9b4d)"
                                                            : "rgba(255, 255, 255, 0.08)",
                                                        border: isAdmin
                                                            ? "1px solid rgba(52, 201, 97, 0.2)"
                                                            : "1px solid rgba(255, 255, 255, 0.06)",
                                                        borderRadius: isAdmin
                                                            ? "20px 20px 4px 20px"
                                                            : "4px 20px 20px 20px",
                                                        color: "#fff",
                                                    }}
                                                >
                                                    {msg.text.split("\n").map((line, idx) => (
                                                        <p key={idx} className={idx > 0 ? "mt-1" : ""}>
                                                            {line}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Messages Input Composer */}
                                <div className="p-4 bg-black/15 border-t border-white/5 flex-shrink-0">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            disabled={activeSessionDetail.status !== "human_active"}
                                            placeholder={
                                                activeSessionDetail.status !== "human_active"
                                                    ? "Click 'Take Over Chat' to start typing replies..."
                                                    : "Type a support message response..."
                                            }
                                            className="flex-1 input-dark px-4 py-2.5 rounded-xl text-xs disabled:opacity-40"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputText.trim() || activeSessionDetail.status !== "human_active" || sending}
                                            className="btn-primary-green px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                                        >
                                            Send
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-white/30">
                                <p className="text-4xl mb-2">💬</p>
                                <p className="font-semibold text-sm">Select a Chat Session</p>
                                <p className="text-xs mt-1 text-white/20">Select an active request from the queue to start supporting users.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
