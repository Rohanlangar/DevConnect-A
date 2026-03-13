import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, removeToken } from "../services/api";
import Navbar from "../components/Navbar";
import "./Profile.css";

export default function Profile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await apiFetch("/auth/getprofile/");
                setUser(data);
                // Store username for chat
                if (data.username) {
                    localStorage.setItem("username", data.username);
                }
            } catch {
                // Token may be invalid
                removeToken();
                navigate("/login");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [navigate]);

    const handleLogout = async () => {
        await apiFetch("/auth/logout/", { method: "POST" });
        removeToken();
        localStorage.removeItem("username");
        navigate("/login");
    };

    return (
        <>
            <Navbar />
            <div className="profile-page">
                {loading ? (
                    <div className="profile-loading">
                        <span className="spinner"></span>
                        Loading profile...
                    </div>
                ) : user ? (
                    <div className="profile-card glass-card">
                        <div className="profile-avatar">
                            {user.username?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="profile-username">{user.username}</div>
                        <div className="profile-handle">@{user.username}</div>

                        <div className="profile-details">
                            <div className="profile-field">
                                <span className="profile-field-label">User ID</span>
                                <span className="profile-field-value">#{user.id}</span>
                            </div>
                            <div className="profile-field">
                                <span className="profile-field-label">Username</span>
                                <span className="profile-field-value">{user.username}</span>
                            </div>
                            <div className="profile-field">
                                <span className="profile-field-label">Email</span>
                                <span className="profile-field-value">
                                    {user.email || "Not set"}
                                </span>
                            </div>
                        </div>

                        <div className="profile-actions">
                            <button className="btn btn-secondary" onClick={() => navigate("/")}>
                                ← Dashboard
                            </button>
                            <button className="btn btn-danger" onClick={handleLogout}>
                                Logout
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="profile-loading">Failed to load profile</div>
                )}
            </div>
        </>
    );
}
