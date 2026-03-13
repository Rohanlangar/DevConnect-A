import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setToken } from "../services/api";
import "./Auth.css";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { ok, data } = await apiFetch("/auth/login/", {
                method: "POST",
                body: JSON.stringify({ username, password }),
            });

            if (data.token) {
                setToken(data.token);
                navigate("/");
            } else {
                setError(data.message || "Invalid credentials");
            }
        } catch {
            setError("Network error. Is the server running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="code-decoration top-left">{"// authentication.js"}</div>
                <div className="code-decoration bottom-right">{"// end module"}</div>

                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="bracket">&lt;</span>
                        DevConnect
                        <span className="slash">/</span>
                        <span className="bracket">&gt;</span>
                    </div>
                    <p className="auth-subtitle">Sign in to your developer workspace</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form glass-card">
                    {error && <div className="auth-error">⚠ {error}</div>}

                    <div className="form-group">
                        <label className="form-label">username</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">password</label>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="auth-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="spinner"></span> : "Sign In →"}
                        </button>
                    </div>

                    <div className="auth-footer">
                        Don&apos;t have an account?{" "}
                        <Link to="/signup">Create one</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
