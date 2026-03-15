import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, getWebSocketURL } from "../services/api";
import "./ChatRoom.css";

export default function ChatRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState("");
    const wsRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesTopRef = useRef(null);

    const [fetchingHistory, setFetchingHistory] = useState(true);
    // Cursor pagination: URL to fetch the next page of older messages
    const [olderMessagesUrl, setOlderMessagesUrl] = useState(null);
    const [loadingOlder, setLoadingOlder] = useState(false);
    // Track whether the last update was from loading older messages (to prevent scroll-to-bottom)
    const isLoadingOlderRef = useRef(false);
    const chatContainerRef = useRef(null);

    // Get current username from localStorage or profile
    useEffect(() => {
        const storedUser = localStorage.getItem("username");
        if (storedUser) setCurrentUser(storedUser);
    }, []);

    // Fetch history then connect WebSocket
    useEffect(() => {
        let ws;
        let isMounted = true;

        const initializeChat = async () => {
            console.log("Initializing chat for roomId:", roomId);
            // 1. Fetch History (now returns cursor-paginated response)
            try {
                const { ok, data } = await apiFetch(`/room/getAllMsg/${roomId}/`);
                
                if (!isMounted) return;

                if (ok && data) {
                    // Paginated response: { next, previous, results: [...] }
                    const results = data.results || [];
                    const formattedHistory = results.map(formatMessage);
                    // Results are newest-first from backend, reverse to show oldest on top
                    setMessages(formattedHistory.reverse());
                    // "next" in cursor pagination (ordered by -created_at) = older messages
                    setOlderMessagesUrl(data.next || null);
                }
            } catch (err) {
                if (isMounted) console.error("Failed to load message history:", err);
            } finally {
                if (isMounted) setFetchingHistory(false);
            }

            if (!isMounted) return;

            // 2. Connect WebSocket
            const wsUrl = getWebSocketURL(roomId);
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (isMounted) setConnected(true);
            };
            ws.onclose = () => {
                if (isMounted) setConnected(false);
            };
            ws.onerror = () => {
                if (isMounted) setConnected(false);
            };

            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                setMessages((prev) => [
                    ...prev,
                    {
                        user: data.user,
                        message: data.message,
                        time: new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                    },
                ]);
            };
        };

        initializeChat();

        return () => {
            isMounted = false;
            if (ws) ws.close();
        };
    }, [roomId]);

    // Auto-scroll: only scroll to bottom for NEW messages, not when loading older ones
    useEffect(() => {
        if (isLoadingOlderRef.current) {
            // After loading older messages, do NOT scroll to bottom.
            // The scroll position is preserved by the loadOlderMessages function.
            isLoadingOlderRef.current = false;
            return;
        }
        // For new messages (WebSocket or initial load), scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Helper to format a message object from the API
    const formatMessage = (msg) => {
        const dateObj = new Date(msg.created_at);
        const timeStr = isNaN(dateObj) ? "" : dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
        return {
            user: msg.sender,
            message: msg.content,
            time: timeStr,
        };
    };

    // Load older messages using the cursor pagination URL
    const loadOlderMessages = async () => {
        if (!olderMessagesUrl || loadingOlder) return;
        setLoadingOlder(true);

        // Save scroll position BEFORE adding older messages
        const container = chatContainerRef.current;
        const prevScrollHeight = container ? container.scrollHeight : 0;

        try {
            const res = await fetch(olderMessagesUrl, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${localStorage.getItem("token")}`,
                },
            });
            const data = await res.json();

            if (res.ok && data.results) {
                const olderFormatted = data.results.map(formatMessage).reverse();

                // Tell the auto-scroll effect to NOT scroll to bottom
                isLoadingOlderRef.current = true;

                // Prepend older messages
                setMessages((prev) => [...olderFormatted, ...prev]);
                setOlderMessagesUrl(data.next || null);

                // After React re-renders, restore scroll so user stays at the same position
                // The new content pushes everything down, so we offset by the height difference
                requestAnimationFrame(() => {
                    if (container) {
                        const newScrollHeight = container.scrollHeight;
                        container.scrollTop = newScrollHeight - prevScrollHeight;
                    }
                });
            }
        } catch (err) {
            console.error("Failed to load older messages:", err);
        } finally {
            setLoadingOlder(false);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !wsRef.current || wsRef.current.readyState !== 1)
            return;

        wsRef.current.send(JSON.stringify({ message: input.trim() }));
        setInput("");
    };

    return (
        <div className="chatroom">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-left">
                    <button className="chat-back-btn" onClick={() => navigate("/")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="chat-room-info">
                        <h2>Room #{roomId}</h2>
                        <span>room/{roomId}</span>
                    </div>
                </div>
                <div className="chat-status">
                    <span className={`status-dot ${connected ? "online" : "offline"}`}></span>
                    {connected ? "Connected" : "Disconnected"}
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={chatContainerRef}>
                {fetchingHistory ? (
                    <div className="chat-empty">
                        <span className="spinner"></span>
                        <div className="chat-empty-text">Loading history...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty">
                        <div className="chat-empty-icon">💬</div>
                        <div className="chat-empty-text">
                            {"// no messages yet — say hello!"}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Load Older Messages button - shown when there are more pages */}
                        {olderMessagesUrl && (
                            <div style={{ textAlign: "center", padding: "12px 0" }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={loadOlderMessages}
                                    disabled={loadingOlder}
                                    style={{ fontSize: "0.85rem", padding: "6px 16px" }}
                                >
                                    {loadingOlder ? (
                                        <span className="spinner" style={{ width: 14, height: 14 }} />
                                    ) : (
                                        "↑ Load older messages"
                                    )}
                                </button>
                            </div>
                        )}
                        {messages.map((msg, idx) => {
                            const isOwn = currentUser && msg.user === currentUser;
                            return (
                                <div
                                    key={idx}
                                    className={`message-group ${isOwn ? "own" : "other"}`}
                                >
                                    <span className="message-sender">
                                        @{msg.user}
                                    </span>
                                    <div className="message-bubble">{msg.message}</div>
                                    <span className="message-time">{msg.time}</span>
                                </div>
                            );
                        })}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="chat-input-bar" onSubmit={sendMessage}>
                <input
                    type="text"
                    className="chat-input"
                    placeholder={
                        connected ? "Type a message..." : "Connecting..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={!connected}
                    autoFocus
                />
                <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={!connected || !input.trim()}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </form>
        </div>
    );
}
