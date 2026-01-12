import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	CommandInput,
	type CommandInputHandle,
} from "../components/CommandInput";
import { ShortcutBar } from "../components/ShortcutBar";
import {
	TerminalOutput,
	type TerminalOutputHandle,
} from "../components/TerminalOutput";
import { PasswordModal } from "../components/PasswordModal";
import type { ConnectionParams } from "../services/api";
import { API_BASE } from "../services/api";
import styles from "./TerminalPage.module.css";

export function TerminalPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const socketRef = useRef<WebSocket | null>(null);
	const shellRef = useRef<TerminalOutputHandle>(null);
	const commandInputRef = useRef<CommandInputHandle>(null);
	const [viewportHeight, setViewportHeight] = useState("100%");
	const [isAlternateBuffer, setIsAlternateBuffer] = useState(false);
	const [inputCmd, setInputCmd] = useState("");

	const [connectionParams, setConnectionParams] = useState<ConnectionParams>(
		location.state as ConnectionParams,
	);
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

	// Helper to send messages
	const sendMessage = (msg: {
		type: "data" | "resize";
		payload?: string;
		rows?: number;
		cols?: number;
	}) => {
		if (socketRef.current?.readyState === WebSocket.OPEN) {
			socketRef.current.send(JSON.stringify(msg));
		}
	};

	// Handle Visual Viewport for mobile keyboards
	useEffect(() => {
		// Update title
		if (connectionParams?.host) {
			document.title = `${connectionParams.host} - nash`;
		}

		const handleResize = () => {
			if (window.visualViewport) {
				setViewportHeight(`${window.visualViewport.height}px`);
				window.scrollTo(0, 0); // Keep content at top
			}
		};

		if (window.visualViewport) {
			window.visualViewport.addEventListener("resize", handleResize);
			// Removing scroll listener to prevent jitter/stiff scrolling on mobile
			window.visualViewport.addEventListener("scroll", handleResize);
			// Initial set
			handleResize();
		}

		return () => {
			document.title = "nash - Mobile SSH Client"; // Reset title
			if (window.visualViewport) {
				window.visualViewport.removeEventListener("resize", handleResize);
				window.visualViewport.removeEventListener("scroll", handleResize);
			}
		};
	}, [connectionParams?.host]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Re-connect when connectionParams change
	useEffect(() => {
		if (!connectionParams) {
			navigate("/");
			return;
		}

		const connect = () => {
			// Setup Websocket
			let wsUrl = API_BASE.replace("http", "ws");
			if (!wsUrl) {
				const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
				wsUrl = `${protocol}//${window.location.host}`;
			}
			// Append query params for connection
			const query = new URLSearchParams({
				host: connectionParams.host || "",
				port: connectionParams.port || "22",
				user: connectionParams.user || "",
				pass: connectionParams.password || "",
				identity_file: connectionParams.identityFile || "",
			});

			const fullUrl = `${wsUrl}/ws?${query.toString()}`;

			const socket = new WebSocket(fullUrl);
			socketRef.current = socket;

			socket.onopen = () => {
				shellRef.current?.write("\r\nConnected to server.\r\n");
				// Auto-focus command input on connection
				setTimeout(() => {
					commandInputRef.current?.focus();
				}, 100);
			};

			socket.onmessage = (ev) => {
				if (ev.data === "AUTH_REQUIRED") {
					setIsPasswordModalOpen(true);
					shellRef.current?.write("\r\nPassword authentication required.\r\n");
				} else {
					shellRef.current?.write(ev.data);
				}
			};

			socket.onclose = (ev) => {
				// 1000: Normal Closure, 1006: Abnormal Closure
				shellRef.current?.write(
					`\r\nConnection closed. Code: ${ev.code}, Reason: ${ev.reason}\r\n`,
				);
			};

			socket.onerror = (error) => {
				console.error("WebSocket Error:", error);
				shellRef.current?.write(`\r\nConnection error.\r\n`);
			};
		};

		// Debounce connection to handle React Strict Mode double-mount
		const timerId = setTimeout(() => {
			// Close existing if any
			if (socketRef.current) {
				socketRef.current.close();
			}
			connect();
		}, 50);

		return () => {
			clearTimeout(timerId);

			if (
				socketRef.current &&
				(socketRef.current.readyState === WebSocket.OPEN ||
					socketRef.current.readyState === WebSocket.CONNECTING)
			) {
				console.log("Closing socket explicitly");
				socketRef.current.close();
			}
			socketRef.current = null;
		};
	}, [connectionParams, navigate]);

	const handleData = (data: string) => {
		sendMessage({ type: "data", payload: data });
	};

	const handleResize = (cols: number, rows: number) => {
		sendMessage({ type: "resize", cols, rows });
	};

	const handleBufferChange = (isAlt: boolean) => {
		setIsAlternateBuffer(isAlt);
	};

	// Logic for executing command
	const executeCommand = () => {
		handleData(`${inputCmd}\r`);
		setInputCmd("");
	};

	const handleVirtualKey = (key: string) => {
		// Intercept Enter key from ShortcutBar
		if (key === "\r") {
			if (!isAlternateBuffer) {
				// Normal mode: Send accumulated inputCmd
				executeCommand();
			} else {
				// Interactive mode (vim etc): Send raw Enter
				handleData("\r");
			}
		} else {
			// Other keys
			handleData(key);
		}

		shellRef.current?.focus();
	};

	const handlePasswordSubmit = (password: string) => {
		setConnectionParams((prev) => ({ ...prev, password }));
		setIsPasswordModalOpen(false);
	};

	return (
		<div className={styles.pageContainer} style={{ height: viewportHeight }}>
			{/* Terminal Area (Flex Grow) */}
			<div className={styles.terminalArea}>
				<TerminalOutput
					ref={shellRef}
					onData={handleData}
					onResize={handleResize}
					onBufferChange={handleBufferChange}
				/>
			</div>

			{/* Command Input Bar - only visible in normal buffer */}
			<CommandInput
				ref={commandInputRef}
				visible={!isAlternateBuffer}
				value={inputCmd}
				onChange={setInputCmd}
				onEnter={executeCommand}
			/>

			{/* Shortcut Bar (Always visible) */}
			<div className={styles.shortcutContainer}>
				<ShortcutBar onKey={handleVirtualKey} />
			</div>

			<PasswordModal
				isOpen={isPasswordModalOpen}
				onSubmit={handlePasswordSubmit}
				onCancel={() => navigate("/")}
			/>
		</div>
	);
}
