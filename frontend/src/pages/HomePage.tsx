import { Terminal, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectForm } from "../components/ConnectForm";
import { HostList } from "../components/HostList";
import type { SSHHost, ActiveSession } from "../services/api";
import { fetchHosts, fetchSessions } from "../services/api";
import { ActiveSessionList } from "../components/ActiveSessionList";
import styles from "./HomePage.module.css";

export function HomePage() {
	const [hosts, setHosts] = useState<SSHHost[]>([]);
	const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [showSkeleton, setShowSkeleton] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const loadData = async () => {
			const [h, s] = await Promise.all([fetchHosts(), fetchSessions()]);
			setHosts(h);
			setActiveSessions(s);
			setIsLoading(false);
		};

		setIsLoading(true);
		setShowSkeleton(false);

		// 200ms以上かかった場合のみスケルトンを表示
		const timer = setTimeout(() => {
			setShowSkeleton(true);
		}, 200);

		loadData().then(() => {
			clearTimeout(timer);
		});

		// Polling for active sessions
		const interval = setInterval(async () => {
			const sessions = await fetchSessions();
			setActiveSessions(sessions);
		}, 5000);

		return () => {
			clearTimeout(timer);
			clearInterval(interval);
		};
	}, []);

	const connect = (
		host: string,
		user: string,
		port: string,
		pass?: string,
		identityFile?: string,
		identityKey?: string,
	) => {
		navigate("/terminal", {
			state: {
				host,
				user,
				port,
				password: pass,
				authType: pass ? "password" : "none",
				identityFile,
				identityKey,
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
			undefined, // Saved hosts don't have raw key content stored in this way usually
		);
	};

	const handleResume = async (s: ActiveSession) => {
		// Check if Passkey Auth is enabled
		const passkeyEnabled = localStorage.getItem("passkeyEnabled") === "true";

		if (passkeyEnabled && window.PublicKeyCredential) {
			try {
				// We assume registration happened in Settings if enabled.
				// But just in case, we check registered flag logic?
				// Actually, if settings says ON, we should just enforce `get`.

				const commonOptions = {
					challenge: new Uint8Array(32), // In real world use server challenge
					timeout: 60000,
				};
				window.crypto.getRandomValues(commonOptions.challenge);

				// Only Authenticate
				await navigator.credentials.get({
					publicKey: {
						...commonOptions,
						rpId: window.location.hostname,
						userVerification: "required",
					},
				});

				// Success -> Proceed
			} catch (e) {
				console.warn("WebAuthn canceled or failed", e);
				// Auth failed/canceled -> Stop connection
				return;
			}
		}

		// Proceed to connect
		const isSecure = window.location.protocol === "https:";
		// biome-ignore lint/suspicious/noDocumentCookie: Cookie is used for session resumption
		document.cookie = `nash-session=${s.id}; path=/; max-age=1800; ${isSecure ? "secure;" : ""} samesite=strict`;

		// Navigate with minimal params (backend has the rest)
		// But TerminalPage expects connectionParams in location.state?
		// The `useEffect` in `TerminalPage` checks `connectionParams`.
		// If state is missing, it redirects to `/`.
		// So we MUST pass valid-ish params.
		// We have host/user/port from session info.
		navigate("/terminal", {
			state: {
				host: s.host,
				user: s.user,
				port: s.port.toString(),
				authType: "none", // Already authenticated
			},
		});
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

			<ActiveSessionList sessions={activeSessions} onResume={handleResume} />

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
