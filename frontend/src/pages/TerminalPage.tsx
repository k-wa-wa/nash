import { useEffect, useRef, useState } from "react";
import { Power, Sparkles } from "lucide-react";
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
import { AuthModal } from "../components/AuthModal";
import { AiSummaryOverlay } from "../components/AiSummaryOverlay";
import { CommandCompletionBar } from "../components/CommandCompletionBar";
import {
	getSuggestions,
	parseHistoryCommands,
	type Suggestion,
} from "../utils/SuggestionEngine";
import type { ConnectionParams } from "../services/api";
import { API_BASE } from "../services/api";
import styles from "./TerminalPage.module.css";

interface ChallengeState {
	instruction: string;
	questions: string[];
	echos: boolean[];
}

export function TerminalPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const socketRef = useRef<WebSocket | null>(null);
	const shellRef = useRef<TerminalOutputHandle>(null);
	const commandInputRef = useRef<CommandInputHandle>(null);
	const [viewportHeight, setViewportHeight] = useState("100%");
	const [isAlternateBuffer, setIsAlternateBuffer] = useState(false);
	const [inputCmd, setInputCmd] = useState("");
	const [historyCommands, setHistoryCommands] = useState<string[]>([]);

	// Derived state for suggestions
	const suggestions = getSuggestions(inputCmd, historyCommands);

	const [connectionParams, setConnectionParams] = useState<ConnectionParams>(
		location.state as ConnectionParams,
	);
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [authModalConfig, setAuthModalConfig] = useState<{
		title: string;
		description: string;
		promptLabel: string;
		isPassword: boolean;
		showInput?: boolean;
	}>({
		title: "Password Required",
		description: "Authentication failed. Please enter password for this host.",
		promptLabel: "Password",
		isPassword: true,
		showInput: true,
	});
	const [currentChallenge, setCurrentChallenge] =
		useState<ChallengeState | null>(null);

	// AI Summary state
	const [aiEnabled, setAiEnabled] = useState(true); // localStorageから読み込み
	const aiEnabledRef = useRef(true);
	const [isOverlayOpen, setIsOverlayOpen] = useState(false);
	const [summary, setSummary] = useState("");
	const [isSummarizing, setIsSummarizing] = useState(false);
	const lastOutputRef = useRef("");
	const isPendingSummaryRef = useRef(false);

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
	const sendMessage = (msg: unknown) => {
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
				identity_key: connectionParams.identityKey || "",
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
				// Try parsing JSON first for special messages
				try {
					const msg = JSON.parse(ev.data);
					if (msg.type === "AUTH_CHALLENGE") {
						// msg.payload is already the object because Go's json.RawMessage embeds it raw
						const challenge = msg.payload as ChallengeState;

						setCurrentChallenge(challenge);

						// Handle case where questions is null/empty (Instruction only or no-op)
						const hasQuestions =
							challenge.questions && challenge.questions.length > 0;

						if (!hasQuestions) {
							// Informational challenge (e.g. MOTD or just info before next step)
							// User requested to suppress modal in this case.
							if (challenge.instruction) {
								shellRef.current?.write(`\r\n${challenge.instruction}\r\n`);
							}
							// Auto-respond with empty answers
							sendMessage({
								type: "AUTH_RESPONSE",
								payload: { answers: [] },
							});
							return;
						}

						const firstQuestion = challenge.questions[0];

						setAuthModalConfig({
							title: "Authentication Required",
							description:
								challenge.instruction ||
								"Please answer the following question.",
							promptLabel: firstQuestion,
							isPassword: challenge.echos ? !challenge.echos[0] : true,
							showInput: true,
						});
						setIsAuthModalOpen(true);
						return;
					}
					if (msg.type === "HISTORY_DATA") {
						const rawHistory = msg.payload as string;
						const parsed = parseHistoryCommands(rawHistory);
						setHistoryCommands(parsed);
						return;
					}
				} catch (_e) {
					// Not JSON, treat as standard text output
				}

				if (ev.data === "AUTH_REQUIRED") {
					setAuthModalConfig({
						title: "Password Required",
						description:
							"Authentication failed. Please enter password for this host.",
						promptLabel: "Password",
						isPassword: true,
						showInput: true,
					});
					setCurrentChallenge(null); // Clear any challenge
					setIsAuthModalOpen(true);
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
		if (inputCmd.trim().length > 0) {
			isPendingSummaryRef.current = true;
		}
		handleData(`${inputCmd}\r`);
		setInputCmd("");
	};

	const disconnect = () => {
		if (socketRef.current) {
			socketRef.current.close();
		}
		navigate("/");
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

	const handleAuthSubmit = (value: string) => {
		if (currentChallenge) {
			// Send Challenge Response
			const payload = {
				answers:
					currentChallenge.questions && currentChallenge.questions.length > 0
						? [value]
						: [],
			};
			// We need to send it back as JSON.RawMessage compatible byte array?
			// In main.go: json.Unmarshal(res.Payload, &resPayload)
			// msg := AuthMessage{ Type: "AUTH_RESPONSE", Payload: ... }
			// If we send raw JSON object in Payload, Go Unmarshal might fail if it expects []byte encoded as string?
			// Go's json.RawMessage is just []byte.
			// If we send { type: "...", payload: { answers: [...] } } from JS,
			// Go decodes it into AuthMessage struct where Payload is json.RawMessage.
			// json.RawMessage stores the raw JSON string of that field.
			// So if we send an object, Payload will be the JSON representation of that object.
			// Then we Unmarshal that Payload into AuthResponsePayload.
			// This works! Unlike Marshal-ing []byte which base64 encodes it.
			// Sending objects FROM JS to Go json.RawMessage is fine.

			const msg = {
				type: "AUTH_RESPONSE",
				payload: payload, // This will be kept as raw JSON, then unmarshaled
			};
			sendMessage(msg);
		} else {
			// Fallback to password update (re-connect? No, we need to restart connection usually)
			// But current logic for PASSWORD mode is: update params and re-run useEffect?
			// The original logic was: setConnectionParams -> triggers useEffect -> reconnects with new pass.
			setConnectionParams((prev) => ({ ...prev, password: value }));
		}
		setIsAuthModalOpen(false);
	};

	// AI Summary logic
	const summarizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const handleNewOutput = (data: string) => {
		console.log("[AI Summary] handleNewOutput called", {
			aiEnabled: aiEnabledRef.current,
			isPendingSummary: isPendingSummaryRef.current,
			dataLength: data.length,
		});
		if (!aiEnabledRef.current || !isPendingSummaryRef.current) {
			console.log(
				"[AI Summary] AI is disabled or no summary pending, skipping",
			);
			return;
		}

		lastOutputRef.current += data;

		if (summarizeTimerRef.current) {
			clearTimeout(summarizeTimerRef.current);
		}

		summarizeTimerRef.current = setTimeout(() => {
			console.log("[AI Summary] Timer triggered, checking conditions...");
			checkAndSummarize();
		}, 1000); // 1秒間出力が止まったら要約を検討
	};

	const checkAndSummarize = async () => {
		console.log("[AI Summary] checkAndSummarize called", {
			aiEnabled: aiEnabledRef.current,
			isSummarizing,
			lastOutputLen: lastOutputRef.current.length,
		});
		if (!aiEnabledRef.current || isSummarizing) return;

		// 新たな出力がない場合はスキップ
		if (lastOutputRef.current.length === 0) {
			console.log("[AI Summary] No new output since last summary, skipping");
			return;
		}

		// マーカーベースの出力を取得（引数なしでマーカー優先）
		const bufferText = shellRef.current?.getBufferText() || "";
		console.group("[AI Summary] API Request Details");
		console.log("Buffer Text Length:", bufferText.length);
		console.log("--- FULL BUFFER START ---");
		console.log(bufferText);
		console.log("--- FULL BUFFER END ---");
		console.groupEnd();

		if (bufferText.length < 20) {
			console.log("[AI Summary] Text too short, skipping");
			lastOutputRef.current = "";
			return;
		}

		console.log("[AI Summary] Calling API...");
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
				console.log("[AI Summary] Success:", data.summary);
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
			isPendingSummaryRef.current = false;
		}
	};

	// Handle clicking on terminal to focus input
	const handleTerminalClick = () => {
		// Only focus input if NOT in alternate buffer (e.g. not in vim)
		if (!isAlternateBuffer) {
			commandInputRef.current?.focus();
		}
	};

	const handleSuggestionSelect = (suggestion: Suggestion) => {
		if (suggestion.type === "history") {
			// History selection replaces current input (usually a full command)
			setInputCmd(`${suggestion.text} `);
		} else {
			// Static suggestion logic: Replace the last word being typed
			const lastSpaceIndex = inputCmd.lastIndexOf(" ");
			const prefix = lastSpaceIndex >= 0 ? inputCmd.slice(0, lastSpaceIndex + 1) : "";
			setInputCmd(`${prefix}${suggestion.text} `);
		}
		commandInputRef.current?.focus();
	};

	return (
		<div className={styles.pageContainer} style={{ height: viewportHeight }}>
			{/* Top Actions */}
			{!isAlternateBuffer && (
				<>
					<div className={styles.topLeftActions}>
						<button
							type="button"
							className={styles.disconnectButton}
							onClick={disconnect}
							aria-label="Disconnect"
						>
							<Power size={20} />
						</button>
					</div>
					<div className={styles.topRightActions}>
						<button
							type="button"
							className={styles.aiButton}
							onClick={() => setIsOverlayOpen(!isOverlayOpen)}
							aria-label="AI Summary"
						>
							<Sparkles size={20} />
						</button>
					</div>
				</>
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

			{/* Command Suggestions */}
			{!isAlternateBuffer && suggestions.length > 0 && (
				<div className={styles.completionContainer}>
					<CommandCompletionBar
						suggestions={suggestions}
						onSelect={handleSuggestionSelect}
					/>
				</div>
			)}

			{/* Shortcut Bar (Always visible) */}
			<div className={styles.shortcutContainer}>
				<ShortcutBar onKey={handleVirtualKey} />
			</div>

			<AuthModal
				isOpen={isAuthModalOpen}
				title={authModalConfig.title}
				description={authModalConfig.description}
				promptLabel={authModalConfig.promptLabel}
				isPassword={authModalConfig.isPassword}
				showInput={authModalConfig.showInput}
				onSubmit={handleAuthSubmit}
				onCancel={() => navigate("/")}
			/>
		</div>
	);
}
