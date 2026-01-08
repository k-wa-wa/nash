
import React, { useState } from "react";

interface ConnectFormProps {
    onConnect: (host: string, user: string, port: string, pass?: string) => void;
}

export function ConnectForm({ onConnect }: ConnectFormProps) {
    const [host, setHost] = useState(import.meta.env.VITE_SSH_HOST || "");
    const [user, setUser] = useState(import.meta.env.VITE_SSH_USER || "");
    const [port, setPort] = useState(import.meta.env.VITE_SSH_PORT || "22");
    const [pass, setPass] = useState(import.meta.env.VITE_SSH_PASS || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConnect(host, user, port, pass);
    };

    return (
        <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
            <input
                placeholder="Hostname / IP"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                required
            />
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                }}
            >
                <input
                    placeholder="User"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    required
                />
                <input
                    placeholder="Port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                />
            </div>
            <input
                placeholder="Password (Optional)"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
            />
            <button
                type="submit"
                style={{ marginTop: "10px", background: "#2563eb" }}
            >
                Connect
            </button>
        </form>
    );
}
