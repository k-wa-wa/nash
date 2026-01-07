import { ArrowRight, Terminal } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SSHHost } from "../services/api";
import { fetchHosts } from "../services/api";

export function HomePage() {
	const [hosts, setHosts] = useState<SSHHost[]>([]);
	const [manualHost, setManualHost] = useState("");
	const [manualUser, setManualUser] = useState("");
	const [manualPort, setManualPort] = useState("22");
	const [manualPass, setManualPass] = useState("");

	const navigate = useNavigate();

	useEffect(() => {
		fetchHosts().then(setHosts);
	}, []);

	const connect = (host: string, user: string, port: string, pass?: string) => {
		navigate("/terminal", {
			state: {
				host,
				user,
				port,
				password: pass,
				authType: pass ? "password" : "none",
			},
		});
	};

	const handleManualConnect = (e: React.FormEvent) => {
		e.preventDefault();
		connect(manualHost, manualUser, manualPort, manualPass);
	};

	return (
		<div className="container">
			<h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<Terminal size={32} /> nash{" "}
				<span style={{ fontSize: "0.5em", opacity: 0.5 }}>Mobile SSH</span>
			</h1>

			<section style={{ marginBottom: "30px" }}>
				<h2>Available Hosts</h2>
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					{hosts.length === 0 && (
						<p style={{ opacity: 0.5 }}>No hosts found in ssh_config</p>
					)}
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
							onClick={() =>
								connect(host.HostName, host.User || "root", host.Port || "22")
							}
							onKeyDown={(e) =>
								(e.key === "Enter" || e.key === " ") &&
								connect(host.HostName, host.User || "root", host.Port || "22")
							}
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
									<span style={{ color: "#aaa" }}>{host.User}@</span>
									{host.HostName}
								</div>
							</div>
							<ArrowRight size={20} style={{ opacity: 0.4 }} />
						</button>
					))}
				</div>
			</section>

			<section>
				<h2>Quick Connect</h2>
				<form
					onSubmit={handleManualConnect}
					style={{ display: "flex", flexDirection: "column", gap: "10px" }}
				>
					<input
						placeholder="Hostname / IP"
						value={manualHost}
						onChange={(e) => setManualHost(e.target.value)}
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
							value={manualUser}
							onChange={(e) => setManualUser(e.target.value)}
							required
						/>
						<input
							placeholder="Port"
							type="number"
							value={manualPort}
							onChange={(e) => setManualPort(e.target.value)}
						/>
					</div>
					<input
						placeholder="Password (Optional)"
						type="password"
						value={manualPass}
						onChange={(e) => setManualPass(e.target.value)}
					/>
					<button
						type="submit"
						style={{ marginTop: "10px", background: "#2563eb" }}
					>
						Connect
					</button>
				</form>
			</section>
		</div>
	);
}
