import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectForm } from "../components/ConnectForm";
import { HostList } from "../components/HostList";
import type { SSHHost } from "../services/api";
import { fetchHosts } from "../services/api";
import styles from "./HomePage.module.css";

export function HomePage() {
	const [hosts, setHosts] = useState<SSHHost[]>([]);
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

	const handleConnectHost = (host: SSHHost) => {
		connect(host.HostName, host.User || "root", host.Port || "22");
	};

	return (
		<div className="container">
			<h1 className={styles.header}>
				<Terminal size={32} /> nash{" "}
				<span className={styles.subtitle}>Mobile SSH</span>
			</h1>

			<section className={styles.section}>
				<h2>Available Hosts</h2>
				<HostList hosts={hosts} onConnect={handleConnectHost} />
			</section>

			<section>
				<h2>Quick Connect</h2>
				<ConnectForm onConnect={connect} />
			</section>
		</div>
	);
}
