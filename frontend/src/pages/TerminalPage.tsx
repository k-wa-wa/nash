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

	const params = location.state as ConnectionParams;

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
		if (params?.host) {
			document.title = `${params.host} - nash`;
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
	}, [params?.host]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Setup only once
	useEffect(() => {
		if (!params) {
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
				host: params.host || "",
				port: params.port || "22",
				user: params.user || "",
				pass: params.password || "",
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
				shellRef.current?.write(ev.data);
			};

			socket.onclose = (ev) => {
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
			connect();
		}, 50);

		return () => {
			// If unmount happens quickly (Strict Mode), clear timeout and don't connect
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
	}, []);

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
		</div>
	);
}
