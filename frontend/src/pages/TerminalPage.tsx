import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "@xterm/xterm/css/xterm.css";
import { VirtualKeyboard } from "../components/VirtualKeyboard";
import type { ConnectionParams } from "../services/api";
import { API_BASE } from "../services/api";

export function TerminalPage() {
	const terminalRef = useRef<HTMLDivElement>(null);
	const location = useLocation();
	const navigate = useNavigate();
	const [termInstance, setTermInstance] = useState<Terminal | null>(null);
	const socketRef = useRef<WebSocket | null>(null);

	const params = location.state as ConnectionParams;

	// biome-ignore lint/correctness/useExhaustiveDependencies: Setup only once
	useEffect(() => {
		if (!params) {
			navigate("/");
			return;
		}

		// Setup Xterm
		const term = new Terminal({
			cursorBlink: true,
			fontSize: 14,
			fontFamily: 'Menlo, Monaco, "Courier New", monospace',
			theme: {
				background: "#0a0a0a",
				foreground: "#f0f0f0",
			},
		});

		const fitAddon = new FitAddon();
		term.loadAddon(fitAddon);

		if (terminalRef.current) {
			term.open(terminalRef.current);
			fitAddon.fit();
		}
		setTermInstance(term);

		// Setup Websocket
		let wsUrl = API_BASE.replace("http", "ws");
		if (!wsUrl) {
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			wsUrl = `${protocol}//${window.location.host}`;
		}
		// Append query params for connection
		const query = new URLSearchParams({
			host: params.host,
			port: params.port,
			user: params.user,
			pass: params.password || "",
		});

		const socket = new WebSocket(`${wsUrl}/ws?${query.toString()}`);
		socketRef.current = socket;

		socket.onopen = () => {
			term.write("\r\nConnected to server...\r\n");
			fitAddon.fit();
			// Resize after a small delay to ensure container is ready
			setTimeout(() => fitAddon.fit(), 100);
		};

		socket.onmessage = (ev) => {
			term.write(ev.data);
		};

		socket.onclose = () => {
			term.write("\r\nConnection closed.\r\n");
		};

		socket.onerror = () => {
			term.write("\r\nConnection error.\r\n");
		};

		term.onData((data) => {
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(data);
			}
		});

		const resizeObserver = new ResizeObserver(() => {
			fitAddon.fit();
		});
		if (terminalRef.current) {
			resizeObserver.observe(terminalRef.current);
		}

		return () => {
			if (
				socket.readyState === WebSocket.OPEN ||
				socket.readyState === WebSocket.CONNECTING
			) {
				socket.close();
			}
			term.dispose();
			resizeObserver.disconnect();
		};
	}, []);

	const handleKeyClick = (key: string) => {
		if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
			socketRef.current.send(key);
		}
		if (termInstance) {
			termInstance.focus();
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100vh",
				width: "100vw",
				background: "black",
			}}
		>
			<div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
				<div ref={terminalRef} style={{ width: "100%", height: "100%" }} />
			</div>
			<div style={{ flexShrink: 0 }}>
				<VirtualKeyboard onKey={handleKeyClick} />
			</div>
		</div>
	);
}
