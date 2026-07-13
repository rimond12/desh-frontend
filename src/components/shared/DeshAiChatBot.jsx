import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Helper for SVG icons
function ChatIcon({ size = 24, className }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

function CloseIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function SendIcon({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    );
}

export default function DeshAiChatBot() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [presets, setPresets] = useState([]);
    const [inputText, setInputText] = useState("");
    const [sessionId, setSessionId] = useState(localStorage.getItem("desh_ai_session_id") || null);
    const [sessionStatus, setSessionStatus] = useState("bot");
    const [collectionStep, setCollectionStep] = useState("none");
    const [loading, setLoading] = useState(false);
    const [resources, setResources] = useState([]);
    const [showResources, setShowResources] = useState(false);
    const messagesEndRef = useRef(null);

    // Fetch resources if user clicks "Manual Guides & Resources" preset
    const fetchResources = async () => {
        try {
            const token = user ? await user.getIdToken() : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get(`${API_BASE}/resources`, { headers });
            setResources(res.data.resources || []);
        } catch (err) {
            console.error("Error fetching resources in chatbot:", err);
        }
    };

    // Load or initialize chatbot session on open
    useEffect(() => {
        if (!isOpen) return;

        const initializeSession = async () => {
            try {
                if (sessionId) {
                    // Fetch existing session
                    const res = await axios.get(`${API_BASE}/chatbot/session/${sessionId}`);
                    if (res.data.success && res.data.session) {
                        const s = res.data.session;
                        setMessages(s.messages || []);
                        setSessionStatus(s.status);
                        setCollectionStep(s.collectionStep);
                        
                        // Set presets based on status
                        if (s.status === "bot" && s.collectionStep === "none") {
                            setPresets([
                                { label: "What is DESHboard?", action: "query" },
                                { label: "How to use the software?", action: "query" },
                                { label: "Manual Guides & Resources", action: "resources" },
                                { label: "Chat with Customer Service", action: "human_support" }
                            ]);
                        } else {
                            setPresets([]);
                        }
                        return;
                    }
                }
                
                // If no session or session not found, start a new conversation
                setLoading(true);
                const token = user ? await user.getIdToken() : null;
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const res = await axios.post(`${API_BASE}/chatbot/message`, { messageText: "" }, { headers });
                
                if (res.data.success) {
                    const s = res.data.session;
                    setSessionId(s._id);
                    localStorage.setItem("desh_ai_session_id", s._id);
                    setMessages(s.messages || []);
                    setSessionStatus(s.status);
                    setCollectionStep(s.collectionStep);
                    setPresets(res.data.presets || []);
                }
            } catch (err) {
                console.error("Error loading chat session:", err);
            } finally {
                setLoading(false);
            }
        };

        initializeSession();
    }, [isOpen, sessionId, user]);

    // Scroll to bottom whenever messages list or input status changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, collectionStep, showResources, loading]);

    // Polling support chat updates if human is active/requested
    useEffect(() => {
        if (!sessionId) return;
        if (sessionStatus !== "human_active" && sessionStatus !== "human_requested") return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_BASE}/chatbot/session/${sessionId}`);
                if (res.data.success && res.data.session) {
                    const s = res.data.session;
                    setMessages(s.messages || []);
                    setSessionStatus(s.status);
                    setCollectionStep(s.collectionStep);
                }
            } catch (err) {
                console.error("Polling error:", err.message);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [sessionId, sessionStatus]);

    const handleSendMessage = async (textToSend) => {
        const text = textToSend || inputText;
        if (!text && !textToSend) return;
        
        if (!textToSend) setInputText("");
        setLoading(true);
        setShowResources(false);

        try {
            const token = user ? await user.getIdToken() : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.post(`${API_BASE}/chatbot/message`, {
                messageText: text,
                sessionId
            }, { headers });

            if (res.data.success) {
                const s = res.data.session;
                setMessages(s.messages || []);
                setSessionStatus(s.status);
                setCollectionStep(s.collectionStep);
                setPresets(res.data.presets || []);
            }
        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePresetClick = async (preset) => {
        if (preset.action === "link" && preset.url) {
            window.open(preset.url, "_blank");
            return;
        }

        if (preset.action === "resources") {
            setShowResources(true);
            await fetchResources();
            return;
        }

        if (preset.action === "human_support") {
            setLoading(true);
            try {
                const token = user ? await user.getIdToken() : null;
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const res = await axios.post(`${API_BASE}/chatbot/message`, {
                    messageText: "",
                    sessionId,
                    action: "request_human"
                }, { headers });

                if (res.data.success) {
                    const s = res.data.session;
                    setMessages(s.messages || []);
                    setSessionStatus(s.status);
                    setCollectionStep(s.collectionStep);
                    setPresets([]);
                }
            } catch (err) {
                console.error("Error requesting human support:", err);
            } finally {
                setLoading(false);
            }
            return;
        }

        // Default: query action (simulates sending the preset label as a question)
        await handleSendMessage(preset.label);
    };

    const handleResetChat = () => {
        localStorage.removeItem("desh_ai_session_id");
        setSessionId(null);
        setMessages([]);
        setSessionStatus("bot");
        setCollectionStep("none");
        setShowResources(false);
        setPresets([
            { label: "What is DESHboard?", action: "query" },
            { label: "How to use the software?", action: "query" },
            { label: "Manual Guides & Resources", action: "resources" },
            { label: "Chat with Customer Service", action: "human_support" }
        ]);
    };

    return (
        <div style={{ zIndex: 9999 }} className="fixed font-sans">
            {/* Launcher button */}
            {!isOpen && (
                <motion.button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 flex items-center gap-2.5 px-5 py-4 rounded-full text-white font-bold cursor-pointer transition-all duration-300"
                    style={{
                        background: "linear-gradient(135deg, #145C28, #34C961)",
                        boxShadow: "0 8px 32px rgba(20, 92, 40, 0.45)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                    <ChatIcon size={22} className="animate-pulse" />
                    <span className="text-sm font-semibold tracking-wide">DESHai</span>
                </motion.button>
            )}

            {/* Chat Card */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed bottom-6 right-6 w-96 max-h-[85vh] h-[550px] flex flex-col rounded-3xl overflow-hidden text-white"
                        style={{
                            background: "linear-gradient(150deg, rgba(8, 38, 17, 0.95) 0%, rgba(3, 20, 9, 0.98) 100%)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            border: "1px solid rgba(52, 201, 97, 0.25)",
                            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                            maxWidth: "calc(100vw - 32px)",
                        }}
                        initial={{ opacity: 0, y: 50, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.92 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                        {/* Header */}
                        <div
                            className="px-5 py-4 flex items-center justify-between flex-shrink-0"
                            style={{
                                background: "linear-gradient(180deg, rgba(52, 201, 97, 0.15) 0%, transparent 100%)",
                                borderBottom: "1px solid rgba(52, 201, 97, 0.15)",
                            }}
                        >
                            <div className="flex items-center gap-3">
                                {/* Bot Avatar */}
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-white shadow-lg shadow-emerald-950/50"
                                    style={{
                                        border: "2px solid rgba(52, 201, 97, 0.4)",
                                        padding: "4.5px"
                                    }}
                                >
                                    <img src="/images/logo (1).png" alt="DESH" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm tracking-wide text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>
                                        DESHai
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="flex items-center justify-center bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 relative flex mr-1">
                                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                            </span>
                                            <span className="text-[9px] text-emerald-400 font-bold tracking-wider uppercase">
                                                {sessionStatus === "human_active" ? "Agent Connected" : "Online Support"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleResetChat}
                                    title="Reset Conversation"
                                    className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer text-xs font-semibold"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                                >
                                    <CloseIcon size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Message list */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
                            {messages.map((msg, i) => {
                                const isBot = msg.sender === "bot";
                                const isAdmin = msg.sender === "admin";
                                const nameToShow = isBot
                                    ? (msg.senderName === "DESH Ai" ? "DESHai" : (msg.senderName || "DESHai"))
                                    : isAdmin
                                    ? `Agent (${msg.senderName})`
                                    : "You";

                                return (
                                    <div key={i} className={`flex flex-col ${isBot || isAdmin ? "items-start" : "items-end"}`}>
                                        {/* Sender Name */}
                                        <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 px-1.5 ${
                                            isBot || isAdmin ? "text-emerald-400/60" : "text-white/40"
                                        }`}>
                                            {nameToShow}
                                        </span>
                                        {/* Message Bubble */}
                                        <div
                                            className="px-4 py-2.5 rounded-2xl text-[13px] max-w-[85%] leading-relaxed break-words"
                                            style={{
                                                background: isBot || isAdmin
                                                    ? "rgba(255, 255, 255, 0.07)"
                                                    : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                                border: isBot || isAdmin
                                                    ? "1px solid rgba(255, 255, 255, 0.08)"
                                                    : "1px solid rgba(52, 201, 97, 0.3)",
                                                borderRadius: isBot || isAdmin
                                                    ? "4px 20px 20px 20px"
                                                    : "20px 20px 4px 20px",
                                                color: isBot || isAdmin ? "rgba(255, 255, 255, 0.95)" : "#fff",
                                            }}
                                        >
                                            {/* Render simple markdown bold */}
                                            {msg.text.split("\n").map((line, idx) => (
                                                <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
                                                    {line.split("**").map((part, pIdx) => 
                                                        pIdx % 2 === 1 ? <strong key={pIdx} className="text-emerald-400 font-extrabold">{part}</strong> : part
                                                    )}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Show details collection instructions overlay inside list */}
                            {collectionStep && collectionStep !== "none" && collectionStep !== "completed" && (
                                <div className="text-center p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 my-3">
                                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                                        Handover Info Form
                                    </span>
                                    <p className="text-[11px] text-white/70 mt-1 leading-relaxed">
                                        Type details in the input below to queue for a human representative.
                                    </p>
                                </div>
                            )}

                            {/* Show resources templates if preset is resources */}
                            {showResources && (
                                <div className="space-y-2.5 pt-2">
                                    <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider block">
                                        Eco-Park Guides
                                    </span>
                                    {resources.length === 0 ? (
                                        <p className="text-xs text-white/50 italic px-1">Loading manual resources...</p>
                                    ) : (
                                        <div className="grid gap-2">
                                            {resources.slice(0, 5).map((res) => {
                                                const filename = res.fileUrl ? res.fileUrl.split("/").pop() : "";
                                                const downloadLink = res.fileUrl
                                                    ? `${API_BASE.replace(/\/api\/?$/, "")}/api/uploads/download/resources/${filename}`
                                                    : res.linkUrl;
                                                return (
                                                    <a
                                                        key={res._id}
                                                        href={downloadLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs"
                                                        style={{ textDecoration: "none", color: "#fff" }}
                                                    >
                                                        <div className="flex items-center gap-2 truncate pr-2">
                                                            <span>{res.type === "pdf" ? "📄" : "🎥"}</span>
                                                            <span className="truncate font-semibold">{res.title}</span>
                                                        </div>
                                                        <span className="text-emerald-400 font-bold">Open ↗</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Loading state indicator */}
                            {loading && (
                                <div className="flex items-center gap-2 text-xs text-white/40 italic pl-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    <span>DESHai is typing...</span>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Presets pane */}
                        {presets.length > 0 && (
                            <div className="px-5 py-3 flex flex-wrap gap-2 flex-shrink-0 bg-black/20 border-t border-white/5">
                                {presets.map((preset, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handlePresetClick(preset)}
                                        className="text-[11px] font-bold px-3.5 py-2 rounded-full transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-950/20 active:translate-y-0"
                                        style={{
                                            background: "rgba(52, 201, 97, 0.08)",
                                            color: "#4ADE80",
                                            border: "1px solid rgba(52, 201, 97, 0.25)",
                                            backdropFilter: "blur(4px)",
                                        }}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input bar */}
                        <div
                            className="p-4 flex-shrink-0"
                            style={{
                                background: "rgba(3, 17, 7, 0.6)",
                                borderTop: "1px solid rgba(52, 201, 97, 0.15)",
                            }}
                        >
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 border border-white/10 focus-within:border-emerald-500/50 focus-within:bg-white/10 transition-all shadow-inner"
                            >
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={
                                        collectionStep === "name" ? "Type your full name..." :
                                        collectionStep === "email" ? "Type your email address..." :
                                        collectionStep === "phone" ? "Type your phone number..." :
                                        "Ask DESHai a question..."
                                    }
                                    className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-white/35 py-1.5 focus:ring-0"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white cursor-pointer transition-all flex items-center justify-center flex-shrink-0 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-95"
                                >
                                    <SendIcon size={13} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
