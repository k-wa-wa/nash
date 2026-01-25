import { Terminal, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectForm } from "../components/ConnectForm";
import { HostList } from "../components/HostList";
import type { SSHHost } from "../services/api";
import { fetchHosts } from "../services/api";
import styles from "./HomePage.module.css";

export function HomePage() {
	const [hosts, setHosts] = useState<SSHHost[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [showSkeleton, setShowSkeleton] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		setIsLoading(true);
		setShowSkeleton(false);

		// 200ms以上かかった場合のみスケルトンを表示
		const timer = setTimeout(() => {
			setShowSkeleton(true);
		}, 200);

		fetchHosts().then((data) => {
			setHosts(data);
			setIsLoading(false);
			clearTimeout(timer);
		});

		return () => clearTimeout(timer);
	}, []);

	const connect = (
		host: string,
		user: string,
		port: string,
		pass?: string,
		identityFile?: string,
	) => {
		navigate("/terminal", {
			state: {
				host,
				user,
				port,
				password: pass,
				authType: pass ? "password" : "none",
				identityFile,
			},
		});
	};

	const handleConnectHost = (host: SSHHost) => {
		connect(
			host.HostName,
			host.User || "root",
			host.Port || "22",
			undefined,
			host.IdentityFile,
		);
	};

	return (
		<div className="container">
			<div className={styles.headerContainer}>
				<h1 className={styles.header}>
					<Terminal size={32} /> nash{" "}
					<span className={styles.subtitle}>Mobile SSH</span>
				</h1>
				<button
					type="button"
					className={styles.settingsButton}
					onClick={() => navigate("/settings")}
					aria-label="設定"
				>
					<Settings size={24} />
				</button>
			</div>

			<section className={styles.section}>
				<h2>Available Hosts</h2>
				{isLoading && showSkeleton ? (
					<div className={styles.skeletonList}>
						<div className={styles.skeletonItem} />
						<div className={styles.skeletonItem} />
						<div className={styles.skeletonItem} />
					</div>
				) : !isLoading ? (
					<div className={styles.loadedContent}>
						<HostList hosts={hosts} onConnect={handleConnectHost} />
					</div>
				) : null}
			</section>

			<section>
				<h2>Quick Connect</h2>
				<ConnectForm onConnect={connect} />
			</section>
		</div>
	);
}
