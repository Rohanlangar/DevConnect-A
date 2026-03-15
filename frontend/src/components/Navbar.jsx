import { NavLink, useNavigate } from "react-router-dom";
import { removeToken, apiFetch } from "../services/api";
import NotificationBell from "./NotificationBell";
import "./Navbar.css";

export default function Navbar() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await apiFetch("/auth/logout/", { method: "POST" });
        removeToken();
        navigate("/login");
    };

    return (
        <nav className="navbar">
            <NavLink to="/" className="navbar-brand">
                <span className="bracket">&lt;</span>
                DevConnect
                <span className="slash">/</span>
                <span className="bracket">&gt;</span>
            </NavLink>

            <div className="navbar-links">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                        `navbar-link ${isActive ? "active" : ""}`
                    }
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    Rooms
                </NavLink>

                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `navbar-link ${isActive ? "active" : ""}`
                    }
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profile
                </NavLink>

                <NotificationBell />

                <button className="navbar-logout" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Logout
                </button>
            </div>
        </nav>
    );
}

