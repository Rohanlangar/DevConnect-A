import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

export default function Dashboard() {
    const [joinedRooms, setJoinedRooms] = useState([]);
    const [availableRooms, setAvailableRooms] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [newRoomDesc, setNewRoomDesc] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const navigate = useNavigate();

    // Fetch rooms on mount
    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        setFetching(true);
        try {
            // Fetch both endpoints in parallel
            const [joinedRes, availableRes] = await Promise.all([
                apiFetch("/room/JoinedRooms/"),
                apiFetch("/room/getAllRoom/")
            ]);

            if (joinedRes.ok) setJoinedRooms(joinedRes.data || []);
            if (availableRes.ok) setAvailableRooms(availableRes.data || []);
        } catch {
            setError("Failed to load rooms. Is the server running?");
        } finally {
            setFetching(false);
        }
    };

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { data, ok } = await apiFetch("/room/createRoom/", {
                method: "POST",
                body: JSON.stringify({ name: newRoomName, description: newRoomDesc }),
            });

            if (ok && data.room_id) {
                // Instantly add to joined rooms list
                setJoinedRooms((prev) => [
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

    const handleJoinRoom = async (roomId) => {
        setError("");
        
        // Optimistically move it in UI to feel fast
        const roomToJoin = availableRooms.find(r => r.id === roomId);
        if (roomToJoin) {
            setAvailableRooms(prev => prev.filter(r => r.id !== roomId));
            setJoinedRooms(prev => [...prev, roomToJoin]);
        }

        try {
            const { ok, data } = await apiFetch("/room/joinroom/", {
                method: "POST",
                body: JSON.stringify({ room_id: roomId }),
            });

            if (!ok) {
                // Revert if API call fails
                fetchRooms();
                setError(data?.message || "Failed to join room");
            }
        } catch {
            fetchRooms(); // Revert on network error
            setError("Network error joining room");
        }
    };

    const openRoom = (roomId) => {
        navigate(`/room/${roomId}`);
    };

    const renderRoomCard = (room, isJoined, idx) => (
        <div
            key={room.id}
            className={`room-card glass-card ${!isJoined ? 'available-room' : ''}`}
            onClick={isJoined ? () => openRoom(room.id) : undefined}
            style={{ animationDelay: `${idx * 0.05}s`, cursor: isJoined ? 'pointer' : 'default' }}
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
            <div className="room-meta-row" style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '4px 0' }}>
                {room.member_count !== undefined && (
                    <span>👥 {room.member_count} member{room.member_count !== 1 ? 's' : ''}</span>
                )}
                {room.created_by && (
                    <span>by @{room.created_by}</span>
                )}
            </div>
            <div className="room-footer" style={{ borderTop: isJoined ? '' : 'none' }}>
                {isJoined ? (
                    <>
                        <span className="room-meta">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            Chat
                        </span>
                        <span className="room-enter">
                            Enter →
                        </span>
                    </>
                ) : (
                    <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '10px' }}
                        onClick={(e) => {
                            e.stopPropagation(); // prevent card click
                            handleJoinRoom(room.id);
                        }}
                    >
                        Join Room
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <>
            <Navbar />
            <div className="dashboard">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">
                        <span className="accent">~/</span>dashboard
                    </h1>
                    <div className="dashboard-actions">
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

                {error && <div className="auth-error" style={{marginBottom: '20px'}}>⚠ {error}</div>}

                {fetching ? (
                    <div className="empty-state">
                        <span className="spinner" style={{margin: '0 auto', display: 'block'}}></span>
                        <div className="empty-title" style={{marginTop: '16px'}}>Syncing workspace...</div>
                    </div>
                ) : (
                    <>
                        {/* Section: My Rooms */}
                        <div className="room-section" style={{marginBottom: '48px'}}>
                            <h2 style={{fontFamily: 'var(--font-mono)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-bright)'}}>
                                <span className="accent">►</span> My Rooms ({joinedRooms.length})
                            </h2>
                            {joinedRooms.length === 0 ? (
                                <div className="empty-state glass-card" style={{padding: '32px'}}>
                                    <div className="empty-text">You haven&apos;t joined any rooms yet. Join one from the available rooms below or create your own!</div>
                                </div>
                            ) : (
                                <div className="rooms-grid">
                                    {joinedRooms.map((room, idx) => renderRoomCard(room, true, idx))}
                                </div>
                            )}
                        </div>

                        {/* Section: Available Rooms */}
                        <div className="room-section">
                            <h2 style={{fontFamily: 'var(--font-mono)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-secondary)'}}>
                                <span className="accent" style={{color: 'var(--text-muted)'}}>►</span> Available Rooms ({availableRooms.length})
                            </h2>
                            {availableRooms.length === 0 ? (
                                <div className="empty-state glass-card" style={{padding: '32px'}}>
                                    <div className="empty-text">No other rooms available to join right now.</div>
                                </div>
                            ) : (
                                <div className="rooms-grid">
                                    {availableRooms.map((room, idx) => renderRoomCard(room, false, idx))}
                                </div>
                            )}
                        </div>
                    </>
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
        </>
    );
}
