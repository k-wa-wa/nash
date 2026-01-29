import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Lock } from "lucide-react";
import { HomePage } from "./pages/HomePage";
import { TerminalPage } from "./pages/TerminalPage";
import { SettingsPage } from "./pages/SettingsPage";


function App() {
	const [isLocked, setIsLocked] = useState(true);
	const [checkDone, setCheckDone] = useState(false);

	const authenticate = useCallback(async () => {
		if (!window.PublicKeyCredential) {
			alert("WebAuthn supported required for passkey security.");
			return;
		}

		try {
			const commonOptions = {
				challenge: new Uint8Array(32),
				timeout: 60000,
			};
			window.crypto.getRandomValues(commonOptions.challenge);

			await navigator.credentials.get({
				publicKey: {
					...commonOptions,
					rpId: window.location.hostname,
					userVerification: "required",
				},
			});
			setIsLocked(false);
		} catch (e) {
			console.warn("Auth failed or canceled", e);
			// Remain locked
		}
	}, []);

	useEffect(() => {
		const checkAuth = async () => {
			const passkeyEnabled = localStorage.getItem("passkeyEnabled") === "true";
			if (!passkeyEnabled) {
				setIsLocked(false);
				setCheckDone(true);
				return;
			}

			// Enabled -> Try to authenticate
			await authenticate();
			setCheckDone(true);
		};
		checkAuth();
	}, [authenticate]);

	if (!checkDone) {
		return <div style={{ background: "#000", height: "100vh" }} />; // Loading/Splash
	}

	if (isLocked) {
		return (
			<div
				style={{
					height: "100vh",
					width: "100vw",
					backgroundColor: "#000",
					color: "#fff",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					fontFamily: "monospace",
				}}
			>
				<Lock size={64} style={{ marginBottom: "2rem", color: "#666" }} />
				<h1 style={{ fontSize: "1.5rem", marginBottom: "2rem" }}>Nash Locked</h1>
				<button
					type="button"
					onClick={authenticate}
					style={{
						padding: "12px 24px",
						borderRadius: "8px",
						border: "1px solid #333",
						background: "#222",
						color: "#fff",
						fontSize: "1rem",
						cursor: "pointer",
					}}
				>
					Unlock with Passkey
				</button>
			</div>
		);
	}

	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/terminal" element={<TerminalPage />} />
				<Route path="/settings" element={<SettingsPage />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
