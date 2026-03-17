import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, getWebSocketURL } from "../services/api";
import TaskPanel from "../components/TaskPanel";
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

    const [fetchingHistory, setFetchingHistory] = useState(true);
    const [olderMessagesUrl, setOlderMessagesUrl] = useState(null);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const isLoadingOlderRef = useRef(false);
    const chatContainerRef = useRef(null);

    // @Mention state
    const [roomMembers, setRoomMembers] = useState([]);
    const [mentionQuery, setMentionQuery] = useState(null);  // null = dropdown hidden, "" = show all
    const [mentionIndex, setMentionIndex] = useState(0);     // keyboard selection index
    const inputRef = useRef(null);

    // Task panel toggle
    const [showTasks, setShowTasks] = useState(false);

    // Online presence + typing
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState(new Set());
    const typingTimeoutRef = useRef(null);

    // Get current username
    useEffect(() => {
        const storedUser = localStorage.getItem("username");
        if (storedUser) setCurrentUser(storedUser);
    }, []);

    // Fetch room members for @mention autocomplete
    useEffect(() => {
        const fetchMembers = async () => {
            const { ok, data } = await apiFetch(`/room/members/${roomId}/`);
            if (ok && Array.isArray(data)) {
                setRoomMembers(data);
            }
        };
        fetchMembers();
    }, [roomId]);

    // Fetch history then connect WebSocket
    useEffect(() => {
        let ws;
        let isMounted = true;

        const initializeChat = async () => {
            try {
                const { ok, data } = await apiFetch(`/room/getAllMsg/${roomId}/`);
                if (!isMounted) return;
                if (ok && data) {
                    const results = data.results || [];
                    const formattedHistory = results.map(formatMessage);
                    setMessages(formattedHistory.reverse());
                    setOlderMessagesUrl(data.next || null);
                }
            } catch (err) {
                if (isMounted) console.error("Failed to load message history:", err);
            } finally {
                if (isMounted) setFetchingHistory(false);
            }

            if (!isMounted) return;

            const wsUrl = getWebSocketURL(roomId);
            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => { if (isMounted) setConnected(true); };
            ws.onclose = () => { if (isMounted) setConnected(false); };
            ws.onerror = () => { if (isMounted) setConnected(false); };

            ws.onmessage = (e) => {
                const data = JSON.parse(e.data);

                if (data.type === "presence") {
                    setOnlineUsers(data.online_users);
                } else if (data.type === "typing") {
                    setTypingUsers((prev) => {
                        const next = new Set(prev);
                        if (data.is_typing) {
                            next.add(data.user);
                        } else {
                            next.delete(data.user);
                        }
                        return next;
                    });
                } else {
                    // Chat message — also clear sender from typing
                    setTypingUsers((prev) => {
                        const next = new Set(prev);
                        next.delete(data.user);
                        return next;
                    });
                    setMessages((prev) => [
                        ...prev,
                        {
                            user: data.user,
                            message: data.message,
                            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        },
                    ]);
                }
            };
        };

        initializeChat();
        return () => { isMounted = false; if (ws) ws.close(); };
    }, [roomId]);

    // Auto-scroll (skip for older messages)
    useEffect(() => {
        if (isLoadingOlderRef.current) {
            isLoadingOlderRef.current = false;
            return;
        }
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const formatMessage = (msg) => {
        const dateObj = new Date(msg.created_at);
        const timeStr = isNaN(dateObj) ? "" : dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return { user: msg.sender, message: msg.content, time: timeStr };
    };

    const loadOlderMessages = async () => {
        if (!olderMessagesUrl || loadingOlder) return;
        setLoadingOlder(true);
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
                isLoadingOlderRef.current = true;
                setMessages((prev) => [...olderFormatted, ...prev]);
                setOlderMessagesUrl(data.next || null);
                requestAnimationFrame(() => {
                    if (container) {
                        container.scrollTop = container.scrollHeight - prevScrollHeight;
                    }
                });
            }
        } catch (err) {
            console.error("Failed to load older messages:", err);
        } finally {
            setLoadingOlder(false);
        }
    };

    // ─── @Mention Logic ───────────────────────────────────────────

    // Filter members based on what user typed after @
    const filteredMembers = mentionQuery !== null
        ? roomMembers.filter((m) =>
            m.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) &&
            m.username !== currentUser  // don't suggest yourself
        )
        : [];

    // Handle input change: detect @ trigger + send typing event
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInput(value);

        // ── Send typing indicator ──
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: "typing", is_typing: true }));
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                wsRef.current?.send(JSON.stringify({ type: "typing", is_typing: false }));
            }, 1500);
        }

        // Find the last @ that isn't part of a completed mention
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");

        if (lastAtIndex !== -1) {
            // Check there's no space between @ and cursor (user is still typing the name)
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
            if (!textAfterAt.includes(" ")) {
                setMentionQuery(textAfterAt);
                setMentionIndex(0);
                return;
            }
        }
        // No active @ trigger
        setMentionQuery(null);
    };

    // Handle keyboard navigation in the mention dropdown
    const handleKeyDown = (e) => {
        if (mentionQuery === null || filteredMembers.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setMentionIndex((prev) => (prev + 1) % filteredMembers.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        } else if (e.key === "Enter" && mentionQuery !== null && filteredMembers.length > 0) {
            e.preventDefault();
            insertMention(filteredMembers[mentionIndex].username);
        } else if (e.key === "Escape") {
            setMentionQuery(null);
        }
    };

    // Insert the selected username into the input
    const insertMention = (username) => {
        const cursorPos = inputRef.current?.selectionStart || input.length;
        const textBeforeCursor = input.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");

        if (lastAtIndex !== -1) {
            const before = input.slice(0, lastAtIndex);
            const after = input.slice(cursorPos);
            const newValue = `${before}@${username} ${after}`;
            setInput(newValue);

            // Move cursor to after the inserted mention
            setTimeout(() => {
                const newCursorPos = lastAtIndex + username.length + 2; // @ + name + space
                inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
                inputRef.current?.focus();
            }, 0);
        }
        setMentionQuery(null);
    };

    // Render message text with highlighted @mentions
    const renderMessageContent = (text) => {
        // Match @username patterns (word characters after @)
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith("@")) {
                const username = part.slice(1);
                const isMember = roomMembers.some((m) => m.username === username);
                const isMe = username === currentUser;
                return (
                    <span
                        key={i}
                        className={`mention-tag ${isMe ? "mention-me" : isMember ? "mention-other" : ""}`}
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    // ─── Send ─────────────────────────────────────────────────────

    const sendMessage = (e) => {
        e.preventDefault();
        if (mentionQuery !== null && filteredMembers.length > 0) {
            // If dropdown is open and user presses Enter, insert mention instead of sending
            insertMention(filteredMembers[mentionIndex].username);
            return;
        }
        if (!input.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
        wsRef.current.send(JSON.stringify({ message: input.trim() }));
        setInput("");
        setMentionQuery(null);
    };

    // ─── Render ───────────────────────────────────────────────────

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
                    <span className="online-indicator" title={onlineUsers.join(", ")}>
                        👥 {onlineUsers.length} online
                    </span>
                    <button
                        className={`chat-tasks-toggle ${showTasks ? "active" : ""}`}
                        onClick={() => setShowTasks(!showTasks)}
                        title="Toggle tasks panel"
                    >
                        📋 Tasks
                    </button>
                    <span className={`status-dot ${connected ? "online" : "offline"}`}></span>
                    {connected ? "Connected" : "Disconnected"}
                </div>
            </div>

            <div className={`chat-layout ${showTasks ? "with-tasks" : ""}`}>
            {/* Chat column */}
            <div className="chat-main-col">

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
                                    <div className="message-bubble">
                                        {renderMessageContent(msg.message)}
                                    </div>
                                    <span className="message-time">{msg.time}</span>
                                </div>
                            );
                        })}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area with @mention dropdown */}
            <div className="chat-input-wrapper">
                {/* @Mention Dropdown */}
                {mentionQuery !== null && filteredMembers.length > 0 && (
                    <div className="mention-dropdown">
                        {filteredMembers.map((member, idx) => (
                            <div
                                key={member.id}
                                className={`mention-item ${idx === mentionIndex ? "mention-item-active" : ""}`}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // prevent input blur
                                    insertMention(member.username);
                                }}
                                onMouseEnter={() => setMentionIndex(idx)}
                            >
                                <span className="mention-item-avatar">
                                    {member.username.charAt(0).toUpperCase()}
                                </span>
                                <span className="mention-item-name">@{member.username}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                    <div className="typing-indicator">
                        <span className="typing-dots">
                            <span /><span /><span />
                        </span>
                        {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
                    </div>
                )}

                <form className="chat-input-bar" onSubmit={sendMessage}>
                    <input
                        ref={inputRef}
                        type="text"
                        className="chat-input"
                        placeholder={connected ? "Type @ to mention someone..." : "Connecting..."}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
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
            </div>{/* /chat-main-col */}

            {/* Task Panel (sidebar) */}
            {showTasks && (
                <div className="task-panel-col">
                    <TaskPanel roomId={roomId} currentUser={currentUser} />
                </div>
            )}
            </div>{/* /chat-layout */}
        </div>
    );
}
