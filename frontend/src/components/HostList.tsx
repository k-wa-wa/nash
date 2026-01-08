
import { ArrowRight } from "lucide-react";

export interface SSHHost {
    Host: string;
    HostName: string;
    User?: string;
    Port?: string;
}

interface HostListProps {
    hosts: SSHHost[];
    onConnect: (host: SSHHost) => void;
}

export function HostList({ hosts, onConnect }: HostListProps) {
    if (hosts.length === 0) {
        return <p style={{ opacity: 0.5 }}>No hosts found in ssh_config</p>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {hosts.map((host) => (
                <button
                    type="button"
                    key={host.Host}
                    style={{
                        padding: "16px 20px",
                        background: "rgba(30, 30, 30, 0.6)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        width: "100%",
                        textAlign: "left",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                    onClick={() => onConnect(host)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onConnect(host)}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(40, 40, 40, 0.8)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(30, 30, 30, 0.6)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    }}
                >
                    <div>
                        <div style={{ fontWeight: "600", fontSize: "1.1rem" }}>
                            {host.Host}
                        </div>
                        <div style={{ opacity: 0.6, fontSize: "0.9rem", marginTop: "4px" }}>
                            <span style={{ color: "#aaa" }}>{host.User || "root"}@</span>
                            {host.HostName}
                        </div>
                    </div>
                    <ArrowRight size={20} style={{ opacity: 0.4 }} />
                </button>
            ))}
        </div>
    );
}
