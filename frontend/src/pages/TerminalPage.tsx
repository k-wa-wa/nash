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
import { AiSummaryOverlay } from "../components/AiSummaryOverlay";
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

	// AI Summary state
	const [aiEnabled, setAiEnabled] = useState(true); // localStorageから読み込み
	const aiEnabledRef = useRef(true);
	const [isOverlayOpen, setIsOverlayOpen] = useState(false);
	const [summary, setSummary] = useState("");
	const [isSummarizing, setIsSummarizing] = useState(false);
	const lastOutputRef = useRef("");

	// Load AI setting from localStorage
	useEffect(() => {
		const saved = localStorage.getItem("aiSummaryEnabled");
		if (saved !== null) {
			const enabled = saved === "true";
			setAiEnabled(enabled);
			aiEnabledRef.current = enabled;
		}
	}, []);

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

	// Sync aiEnabled state to ref for closure access
	useEffect(() => {
		aiEnabledRef.current = aiEnabled;
	}, [aiEnabled]);

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

				// Ensure terminal feels active
				shellRef.current?.focus();

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
					// 出力を蓄積し、一定時間停止したら要約を実行する
					handleNewOutput(ev.data);
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
		// When inputting data (from ShortcutBar or elsewhere), scroll to bottom
		shellRef.current?.scrollToBottom();
	};

	const handleResize = (cols: number, rows: number) => {
		sendMessage({ type: "resize", cols, rows });
	};

	const handleBufferChange = (isAlt: boolean) => {
		setIsAlternateBuffer(isAlt);
	};

	// Logic for executing command
	const executeCommand = () => {
		// コマンド実行の開始地点にマーカーを設置
		shellRef.current?.registerCommandMarker();
		handleData(`${inputCmd}\r`);
		setInputCmd("");
	};

	const handleInputChange = (val: string) => {
		setInputCmd(val);
		// When typing in CommandInput, scroll to bottom
		if (val.length > 0) {
			shellRef.current?.scrollToBottom();
		}
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

	// AI Summary logic
	const summarizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const handleNewOutput = (data: string) => {
		console.log('[AI Summary] handleNewOutput called', { aiEnabled: aiEnabledRef.current, dataLength: data.length });
		if (!aiEnabledRef.current) {
			console.log('[AI Summary] AI is disabled, skipping');
			return;
		}

		lastOutputRef.current += data;

		if (summarizeTimerRef.current) {
			clearTimeout(summarizeTimerRef.current);
		}

		summarizeTimerRef.current = setTimeout(() => {
			console.log('[AI Summary] Timer triggered, checking conditions...');
			checkAndSummarize();
		}, 1000); // 1秒間出力が止まったら要約を検討
	};

	const checkAndSummarize = async () => {
		console.log('[AI Summary] checkAndSummarize called', { aiEnabled: aiEnabledRef.current, isSummarizing });
		if (!aiEnabledRef.current || isSummarizing) return;

		// マーカーベースの出力を取得（引数なしでマーカー優先）
		const bufferText = shellRef.current?.getBufferText() || "";
		console.group('[AI Summary] API Request Details');
		console.log('Buffer Text Length:', bufferText.length);
		console.log('--- FULL BUFFER START ---');
		console.log(bufferText);
		console.log('--- FULL BUFFER END ---');
		console.groupEnd();

		if (bufferText.length < 20) {
			console.log('[AI Summary] Text too short, skipping');
			lastOutputRef.current = "";
			return;
		}

		console.log('[AI Summary] Calling API...');
		setIsSummarizing(true);
		setSummary("");
		setIsOverlayOpen(true); // 呼び出し開始時にオーバーレイを表示

		try {
			const response = await fetch(`${API_BASE}/api/summarize`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: bufferText }),
			});

			if (response.ok) {
				const data = await response.json();
				console.log('[AI Summary] Success:', data.summary);
				setSummary(data.summary);
				setIsOverlayOpen(true); // 要約完了時に自動で開く
			} else {
				console.error("[AI Summary] API failed with status:", response.status);
			}
		} catch (err) {
			console.error("[AI Summary] Error:", err);
		} finally {
			setIsSummarizing(false);
			lastOutputRef.current = "";
		}
	};

	// Handle clicking on terminal to focus input
	const handleTerminalClick = () => {
		// Only focus input if NOT in alternate buffer (e.g. not in vim)
		if (!isAlternateBuffer) {
			commandInputRef.current?.focus();
		}
	};

	return (
		<div className={styles.pageContainer} style={{ height: viewportHeight }}>
			{/* Top Actions */}
			{!isAlternateBuffer && (
				<div className={styles.topRightActions}>
					<button
						type="button"
						className={styles.aiButton}
						onClick={() => setIsOverlayOpen(!isOverlayOpen)}
						aria-label="AI Summary"
					>
						AI
					</button>
				</div>
			)}

			{/* Terminal Area (Flex Grow) */}
			<div className={styles.terminalArea}>
				{/* AI Summary Overlay */}
				<AiSummaryOverlay
					isOpen={isOverlayOpen}
					summary={summary}
					isLoading={isSummarizing}
					onClose={() => setIsOverlayOpen(false)}
				/>

				<TerminalOutput
					ref={shellRef}
					onData={handleData}
					onResize={handleResize}
					onBufferChange={handleBufferChange}
					onClick={handleTerminalClick}
				/>
			</div>

			{/* Command Input Bar - only visible in normal buffer */}
			<CommandInput
				ref={commandInputRef}
				visible={!isAlternateBuffer}
				value={inputCmd}
				onChange={handleInputChange}
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
