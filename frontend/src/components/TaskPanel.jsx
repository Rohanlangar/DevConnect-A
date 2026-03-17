import { useState, useEffect } from "react";
import { apiFetch } from "../services/api";
import "./TaskPanel.css";

export default function TaskPanel({ roomId, currentUser }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [taskName, setTaskName] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [creating, setCreating] = useState(false);
    const [filter, setFilter] = useState("all"); // all, pending, in_progress, completed

    // Fetch tasks
    useEffect(() => {
        fetchTasks();
    }, [roomId]);

    const fetchTasks = async () => {
        setLoading(true);
        const { ok, data } = await apiFetch(`/room/tasks/${roomId}/`);
        if (ok && Array.isArray(data)) {
            setTasks(data);
        }
        setLoading(false);
    };

    // Create task
    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!taskName.trim()) return;
        setCreating(true);

        const { ok, data } = await apiFetch(`/room/tasks/${roomId}/create/`, {
            method: "POST",
            body: JSON.stringify({ name: taskName.trim(), description: taskDesc.trim() }),
        });

        if (ok && data) {
            setTasks((prev) => [data, ...prev]);
            setTaskName("");
            setTaskDesc("");
            setShowForm(false);
        }
        setCreating(false);
    };

    // Update task status
    const cycleStatus = async (task) => {
        const nextStatus = {
            pending: "in_progress",
            in_progress: "completed",
            completed: "pending",
        };
        const newStatus = nextStatus[task.status];

        const { ok, data } = await apiFetch(`/room/tasks/update/${task.id}/`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
        });

        if (ok && data) {
            setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
        }
    };

    const statusConfig = {
        pending: { label: "Pending", emoji: "⏳", className: "status-pending" },
        in_progress: { label: "In Progress", emoji: "🔄", className: "status-progress" },
        completed: { label: "Done", emoji: "✅", className: "status-done" },
    };

    const filteredTasks = filter === "all"
        ? tasks
        : tasks.filter((t) => t.status === filter);

    const counts = {
        all: tasks.length,
        pending: tasks.filter((t) => t.status === "pending").length,
        in_progress: tasks.filter((t) => t.status === "in_progress").length,
        completed: tasks.filter((t) => t.status === "completed").length,
    };

    return (
        <div className="task-panel">
            <div className="task-panel-header">
                <h3>📋 Tasks</h3>
                <button
                    className="task-add-btn"
                    onClick={() => setShowForm(!showForm)}
                    title="Create task"
                >
                    {showForm ? "✕" : "+"}
                </button>
            </div>

            {/* Create Task Form */}
            {showForm && (
                <form className="task-form" onSubmit={handleCreateTask}>
                    <input
                        type="text"
                        className="task-form-input"
                        placeholder="Task name..."
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        autoFocus
                    />
                    <input
                        type="text"
                        className="task-form-input task-form-desc"
                        placeholder="Description (optional)"
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="task-form-submit"
                        disabled={creating || !taskName.trim()}
                    >
                        {creating ? "Creating..." : "Create Task"}
                    </button>
                </form>
            )}

            {/* Filter tabs */}
            <div className="task-filters">
                {["all", "pending", "in_progress", "completed"].map((f) => (
                    <button
                        key={f}
                        className={`task-filter-btn ${filter === f ? "active" : ""}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === "all" ? "All" : statusConfig[f]?.label}
                        <span className="task-filter-count">{counts[f]}</span>
                    </button>
                ))}
            </div>

            {/* Task List */}
            <div className="task-list">
                {loading ? (
                    <div className="task-empty">Loading tasks...</div>
                ) : filteredTasks.length === 0 ? (
                    <div className="task-empty">
                        {tasks.length === 0
                            ? "No tasks yet — create one!"
                            : `No ${filter.replace("_", " ")} tasks`}
                    </div>
                ) : (
                    filteredTasks.map((task) => {
                        const sc = statusConfig[task.status];
                        return (
                            <div key={task.id} className={`task-item ${sc.className}`}>
                                <button
                                    className="task-status-btn"
                                    onClick={() => cycleStatus(task)}
                                    title={`Click to change status (→ ${statusConfig[
                                        { pending: "in_progress", in_progress: "completed", completed: "pending" }[task.status]
                                    ]?.label})`}
                                >
                                    {task.status === "completed" ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : task.status === "in_progress" ? (
                                        <div className="task-spinner-mini" />
                                    ) : (
                                        <div className="task-circle" />
                                    )}
                                </button>

                                <div className="task-item-content">
                                    <div className={`task-item-name ${task.status === "completed" ? "task-done-text" : ""}`}>
                                        {task.name}
                                    </div>
                                    {task.description && (
                                        <div className="task-item-desc">{task.description}</div>
                                    )}
                                    <div className="task-item-meta">
                                        <span className={`task-badge ${sc.className}`}>
                                            {sc.emoji} {sc.label}
                                        </span>
                                        <span>by @{task.created_by}</span>
                                        {task.assigned.length > 0 && (
                                            <span>
                                                → {task.assigned.map((a) => `@${a.username}`).join(", ")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
