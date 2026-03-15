import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import "./NotificationBell.css";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Poll for notifications every 15 seconds
    useEffect(() => {
        const fetchNotifs = async () => {
            const { ok, data } = await apiFetch("/chat/notifications/");
            if (ok && Array.isArray(data)) {
                setNotifications(data);
            }
        };

        fetchNotifs();
        const interval = setInterval(fetchNotifs, 15000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = async (notif) => {
        // Mark as read
        await apiFetch(`/chat/notifications/${notif.id}/read/`, { method: "POST" });
        // Remove from local state
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
        // Navigate to the room
        setOpen(false);
        navigate(`/room/${notif.room_id}`);
    };

    const handleMarkAllRead = async () => {
        await apiFetch("/chat/notifications/read-all/", { method: "POST" });
        setNotifications([]);
    };

    const count = notifications.length;

    return (
        <div className="notif-wrapper" ref={dropdownRef}>
            <button
                className="notif-bell-btn"
                onClick={() => setOpen(!open)}
                aria-label="Notifications"
            >
                {/* Bell SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {count > 0 && <span className="notif-badge">{count > 9 ? "9+" : count}</span>}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <span className="notif-title">Notifications</span>
                        {count > 0 && (
                            <button className="notif-clear-btn" onClick={handleMarkAllRead}>
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notif-list">
                        {count === 0 ? (
                            <div className="notif-empty">
                                <span>🔔</span>
                                <span>No new notifications</span>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className="notif-item"
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="notif-item-avatar">
                                        {notif.sender.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="notif-item-content">
                                        <div className="notif-item-text">
                                            <strong>@{notif.sender}</strong> mentioned you in{" "}
                                            <strong>{notif.room_name}</strong>
                                        </div>
                                        <div className="notif-item-preview">
                                            "{notif.message_preview}"
                                        </div>
                                        <div className="notif-item-time">
                                            {new Date(notif.created_at).toLocaleString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
