import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

export default function Dashboard() {
    const [rooms, setRooms] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newRoomDesc, setNewRoomDesc] = useState("");
    const [joinRoomId, setJoinRoomId] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // For now, we keep rooms in local state since there's no list endpoint
    // Rooms are added when created or joined

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { data } = await apiFetch("/room/createRoom/", {
                method: "POST",
                body: JSON.stringify({ name: newRoomName, description: newRoomDesc }),
            });

            if (data.room_id) {
                setRooms((prev) => [
                    ...prev,
                    {
                        id: data.room_id,
                        name: newRoomName,
                        description: newRoomDesc,
                    },
                ]);
                setNewRoomName("");
                setNewRoomDesc("");
                setShowCreateModal(false);
            } else {
                setError(data.message || "Failed to create room");
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { data } = await apiFetch("/room/joinroom/", {
                method: "POST",
                body: JSON.stringify({ room_id: joinRoomId }),
            });

            const msg = data.Message || data.message || "";
            if (
                msg.toLowerCase().includes("joined") ||
                msg.toLowerCase().includes("already")
            ) {
                // Add to local list and navigate
                setRooms((prev) => {
                    if (prev.find((r) => String(r.id) === String(joinRoomId)))
                        return prev;
                    return [
                        ...prev,
                        { id: joinRoomId, name: `Room #${joinRoomId}`, description: "" },
                    ];
                });
                setJoinRoomId("");
                setShowJoinModal(false);
                navigate(`/room/${joinRoomId}`);
            } else {
                setError(msg || "Failed to join room");
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    const openRoom = (roomId) => {
        navigate(`/room/${roomId}`);
    };

    return (
        <>
            <Navbar />
            <div className="dashboard">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">
                        <span className="accent">~/</span>rooms
                    </h1>
                    <div className="dashboard-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowJoinModal(true)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            Join Room
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Create Room
                        </button>
                    </div>
                </div>

                {rooms.length === 0 ? (
                    <div className="empty-state glass-card">
                        <div className="empty-icon">💬</div>
                        <div className="empty-title">No rooms yet</div>
                        <p className="empty-text">
                            Create a new room to start collaborating, or join an existing room
                            with its ID.
                        </p>
                    </div>
                ) : (
                    <div className="rooms-grid">
                        {rooms.map((room, idx) => (
                            <div
                                key={room.id}
                                className="room-card glass-card"
                                onClick={() => openRoom(room.id)}
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className="room-card-header">
                                    <div className="room-icon">
                                        {room.name?.charAt(0)?.toUpperCase() || "#"}
                                    </div>
                                    <span className="room-id-badge">#{room.id}</span>
                                </div>
                                <div className="room-name">{room.name}</div>
                                <div className="room-desc">
                                    {room.description || "No description provided"}
                                </div>
                                <div className="room-footer">
                                    <span className="room-meta">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        Chat
                                    </span>
                                    <span className="room-enter">
                                        Enter →
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div
                    className="modal-overlay"
                    onClick={(e) =>
                        e.target === e.currentTarget && setShowCreateModal(false)
                    }
                >
                    <form className="modal glass-card" onSubmit={handleCreateRoom}>
                        <div className="modal-title">
                            <span className="accent">+</span> Create Room
                        </div>
                        {error && <div className="auth-error">⚠ {error}</div>}
                        <div className="form-group">
                            <label className="form-label">room name</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. React Devs"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">description</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="What's this room about?"
                                value={newRoomDesc}
                                onChange={(e) => setNewRoomDesc(e.target.value)}
                            />
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <span className="spinner"></span> : "Create"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Join Room Modal */}
            {showJoinModal && (
                <div
                    className="modal-overlay"
                    onClick={(e) =>
                        e.target === e.currentTarget && setShowJoinModal(false)
                    }
                >
                    <form className="modal glass-card" onSubmit={handleJoinRoom}>
                        <div className="modal-title">
                            <span className="accent">→</span> Join Room
                        </div>
                        {error && <div className="auth-error">⚠ {error}</div>}
                        <div className="form-group">
                            <label className="form-label">room id</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Enter room ID"
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowJoinModal(false)}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <span className="spinner"></span> : "Join"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
