import { useState, useEffect, useRef, useCallback } from "react";
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

    const fetchSessions = useCallback(async (silent = false) => {
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
    }, [axiosSecure]);

    const fetchActiveSession = useCallback(async (id, silent = false) => {
        try {
            const res = await axiosSecure.get(`/chatbot/session/${id}`);
            if (res.data.success) {
                setSelectedSession(res.data.session);
            }
        } catch (err) {
            console.error("Error fetching session detail:", err);
            if (!silent) toast.error("Failed to load conversation details");
        }
    }, [axiosSecure]);

    // Initial load
    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Reload active session details when selection changes
    useEffect(() => {
        if (selectedSessionId) {
            fetchActiveSession(selectedSessionId);
        } else {
            setSelectedSession(null);
        }
    }, [selectedSessionId, fetchActiveSession]);

    // Background polling for sessions list and currently opened session
    useEffect(() => {
        const interval = setInterval(() => {
            fetchSessions(true);
            if (selectedSessionId) {
                fetchActiveSession(selectedSessionId, true);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedSessionId, fetchSessions, fetchActiveSession]);

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
                <div className="mb-5 flex-shrink-0">
                    <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Montserrat, sans-serif", color: "var(--tx)" }}>
                        💬 Support Takeover Center
                    </h1>
                    <p className="text-xs mt-1" style={{ color: "var(--tx-muted)" }}>
                        Take over live chats, collect user details, and support DESH users in real-time.
                    </p>
                </div>

                {/* Dashboard layout */}
                <div className="flex-1 flex gap-5 overflow-hidden w-full">
                    {/* Left Pane: Sessions List */}
                    <div className="w-80 flex flex-col glass-card overflow-hidden flex-shrink-0">
                        <div className="px-4 py-3.5 border-b flex items-center justify-between" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--tx-muted)" }}>
                                Support Queue ({sessions.length})
                            </span>
                            <button
                                onClick={() => fetchSessions()}
                                className="text-xs font-bold cursor-pointer hover:underline"
                                style={{ color: "var(--g700)", background: "none", border: "none" }}
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 scrollbar-thin">
                            {loadingSessions ? (
                                <div className="text-center py-10 text-xs italic" style={{ color: "var(--tx-faint)" }}>Loading support queue...</div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-20" style={{ color: "var(--tx-faint)" }}>
                                    <p className="text-3xl mb-2">📭</p>
                                    <p className="text-xs font-semibold">Queue is empty</p>
                                    <p className="text-[10px] mt-0.5">No active human support requests.</p>
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
                                            className="w-full text-left px-4 py-3.5 transition-all flex flex-col gap-1 cursor-pointer border-l-4"
                                            style={{
                                                background: isSelected
                                                    ? "var(--bg-subtle)"
                                                    : sess.status === "human_requested"
                                                    ? "rgba(245, 158, 11, 0.08)"
                                                    : "transparent",
                                                borderLeftColor: isSelected
                                                    ? "var(--g500)"
                                                    : sess.status === "human_requested"
                                                    ? "#F59E0B"
                                                    : "transparent",
                                                borderBottom: "1px solid var(--border)",
                                                borderRight: "none",
                                                borderTop: "none"
                                            }}
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <span className="font-bold text-xs truncate max-w-[130px]" style={{ color: "var(--tx)" }}>
                                                    {sess.name || "Guest User"}
                                                </span>
                                                <span className="text-[9px] font-semibold" style={{ color: "var(--tx-faint)" }}>
                                                    {timestamp}
                                                </span>
                                            </div>
                                            <p className="text-[11px] truncate w-full" style={{ color: "var(--tx-muted)" }}>
                                                {lastMsg}
                                            </p>
                                            <div className="flex justify-between items-center w-full mt-1">
                                                <span className="text-[9px] truncate max-w-[120px]" style={{ color: "var(--tx-faint)" }}>
                                                    {sess.email || sess.phone || "No details"}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${
                                                    sess.status === "human_requested"
                                                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                                                        : sess.status === "human_active"
                                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                        : "bg-neutral-100 text-neutral-400 border border-neutral-200"
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
                                <div className="px-5 py-4 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-3 flex-shrink-0" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
                                    <div>
                                        <h3 className="font-bold text-sm" style={{ fontFamily: "Montserrat, sans-serif", color: "var(--tx)" }}>
                                            {activeSessionDetail.name || "Guest Chat Session"}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px]" style={{ color: "var(--tx-muted)" }}>
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
                                                <span className="font-bold" style={{ color: activeSessionDetail.status === "human_active" ? "var(--g600)" : "#B45309" }}>
                                                    {activeSessionDetail.status === "human_active" ? "Connected" : "Waiting for Takeover"}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {activeSessionDetail.status === "human_requested" && (
                                            <button
                                                onClick={handleTakeover}
                                                className="btn-primary-green text-[11px] px-4 py-2 font-bold"
                                            >
                                                Take Over Chat
                                            </button>
                                        )}
                                        {activeSessionDetail.status === "human_active" && (
                                            <button
                                                onClick={handleCloseSession}
                                                className="px-4 py-2 rounded-xl text-white font-bold text-[11px] cursor-pointer transition-all hover:opacity-90"
                                                style={{ background: "#D97706", border: "none" }}
                                            >
                                                Close Support
                                            </button>
                                        )}
                                        {activeSessionDetail.status === "closed" && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg border" style={{ background: "var(--bg-soft)", borderColor: "var(--border)", color: "var(--tx-faint)" }}>
                                                Session Closed
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Messages History */}
                                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin" style={{ background: "var(--bg-soft)" }}>
                                    {activeSessionDetail.messages?.map((msg, i) => {
                                        const isAdmin = msg.sender === "admin";
                                        const isBot = msg.sender === "bot";
                                        return (
                                            <div key={i} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                                                <span className="text-[10px] font-semibold mb-1 px-1" style={{ color: "var(--tx-faint)" }}>
                                                    {isAdmin ? `You (${msg.senderName})` : isBot ? "DESH Ai" : (activeSessionDetail.name || "User")}
                                                </span>
                                                <div
                                                    className="px-4 py-2.5 rounded-2xl text-xs max-w-[70%] leading-relaxed break-words"
                                                    style={{
                                                        background: isAdmin
                                                            ? "linear-gradient(135deg, var(--g800), var(--g500))"
                                                            : "var(--bg-card, #fff)",
                                                        border: isAdmin
                                                            ? "1px solid rgba(52, 201, 97, 0.2)"
                                                            : "1px solid var(--border)",
                                                        borderRadius: isAdmin
                                                            ? "20px 20px 4px 20px"
                                                            : "4px 20px 20px 20px",
                                                        color: isAdmin ? "#fff" : "var(--tx)",
                                                        boxShadow: "var(--sh-xs)"
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
                                <div className="p-4 border-t flex-shrink-0" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
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
                                            className="flex-1 input-field disabled:opacity-40"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputText.trim() || activeSessionDetail.status !== "human_active" || sending}
                                            className="btn-primary-green text-xs font-bold"
                                            style={{ padding: "10px 20px" }}
                                        >
                                            Send
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center" style={{ color: "var(--tx-faint)" }}>
                                <p className="text-5xl mb-3">💬</p>
                                <p className="font-semibold text-sm" style={{ color: "var(--tx)" }}>Select a Chat Session</p>
                                <p className="text-xs mt-1">Select an active request from the queue to start supporting users.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
