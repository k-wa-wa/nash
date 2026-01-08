import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Shell, type ShellHandle } from "../components/Shell";
import type { ConnectionParams } from "../services/api";
import { API_BASE } from "../services/api";

export function TerminalPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const socketRef = useRef<WebSocket | null>(null);
	const shellRef = useRef<ShellHandle>(null);
	const [viewportHeight, setViewportHeight] = useState("100%");

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
			if (window.visualViewport) {
				window.visualViewport.removeEventListener("resize", handleResize);
				window.visualViewport.removeEventListener("scroll", handleResize);
			}
		};
	}, []);


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
			};

			socket.onmessage = (ev) => {
				shellRef.current?.write(ev.data);
			};

			socket.onclose = (ev) => {
				shellRef.current?.write(`\r\nConnection closed. Code: ${ev.code}, Reason: ${ev.reason}\r\n`);
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
				socketRef.current && (
					socketRef.current.readyState === WebSocket.OPEN ||
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

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				width: "100%",
				height: viewportHeight,
				overflow: "hidden", // Prevent initial scrollbars
				backgroundColor: "black", // Match terminal bg
			}}
		>
			<Shell ref={shellRef} onData={handleData} onResize={handleResize} />
		</div>
	);
}
