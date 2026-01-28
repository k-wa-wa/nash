import { Terminal, Clock, Monitor } from "lucide-react";
import type { ActiveSession } from "../services/api";
import styles from "./ActiveSessionList.module.css";

interface ActiveSessionListProps {
    sessions: ActiveSession[];
    onResume: (session: ActiveSession) => void;
}

export function ActiveSessionList({
    sessions,
    onResume,
}: ActiveSessionListProps) {
    if (sessions.length === 0) return null;

    // Sort by lastActive desc
    const sorted = [...sessions].sort(
        (a, b) =>
            new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime(),
    );

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds

        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>
                <Monitor size={18} className={styles.icon} />
                Active Sessions
            </h3>
            <div className={styles.list}>
                {sorted.map((s) => (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: Interactive list item
                    // biome-ignore lint/a11y/noStaticElementInteractions: Interactive list item
                    <div
                        key={s.id}
                        className={styles.item}
                        onClick={() => onResume(s)}
                    >
                        <div className={styles.info}>
                            <div className={styles.host}>
                                <Terminal size={16} />
                                <span className={styles.hostName}>{s.host}</span>
                                <span className={styles.user}>({s.user})</span>
                            </div>
                            <div className={styles.meta}>
                                <Clock size={12} />
                                <span>{formatTime(s.lastActive)}</span>
                            </div>
                        </div>
                        <button type="button" className={styles.resumeBtn}>
                            Resume
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
