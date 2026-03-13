import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import "./Auth.css";

export default function Signup() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const { data } = await apiFetch("/auth/signup/", {
                method: "POST",
                body: JSON.stringify({ username, email, password }),
            });

            if (data.message && data.message.toLowerCase().includes("created")) {
                setSuccess("Account created! Redirecting to login...");
                setTimeout(() => navigate("/login"), 1500);
            } else {
                setError(data.message || "Signup failed. Check your inputs.");
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
                <div className="code-decoration top-left">{"// create_account.js"}</div>
                <div className="code-decoration bottom-right">{"// end module"}</div>

                <div className="auth-header">
                    <div className="auth-logo">
                        <span className="bracket">&lt;</span>
                        DevConnect
                        <span className="slash">/</span>
                        <span className="bracket">&gt;</span>
                    </div>
                    <p className="auth-subtitle">Create your developer account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form glass-card">
                    {error && <div className="auth-error">⚠ {error}</div>}
                    {success && <div className="auth-success">✓ {success}</div>}

                    <div className="form-group">
                        <label className="form-label">username</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Choose a username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">email</label>
                        <input
                            type="email"
                            className="input-field"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">password</label>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="auth-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="spinner"></span> : "Create Account →"}
                        </button>
                    </div>

                    <div className="auth-footer">
                        Already have an account?{" "}
                        <Link to="/login">Sign in</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
