import { FitAddon } from "@xterm/addon-fit";
import { Terminal, type IMarker } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import React, { useEffect, useImperativeHandle, useRef } from "react";

export interface TerminalOutputHandle {
	write: (data: string | Uint8Array) => void;
	focus: () => void;
	scrollToBottom: () => void;
	dispose: () => void;
	getBufferText: () => string;
	registerCommandMarker: () => void;
}

interface Props {
	onData: (data: string) => void;
	onResize?: (cols: number, rows: number) => void;
	onBufferChange?: (isAlternate: boolean) => void;
	onClick?: () => void;
}

export const TerminalOutput = React.forwardRef<TerminalOutputHandle, Props>(
	({ onData, onResize, onBufferChange, onClick }, ref) => {
		const terminalRef = useRef<HTMLDivElement>(null);
		const termInstanceRef = useRef<Terminal | null>(null);
		const lastMarkerRef = useRef<IMarker | null>(null);

		// biome-ignore lint/correctness/useExhaustiveDependencies: Setup once
		useEffect(() => {
			const term = new Terminal({
				cursorBlink: true,
				cursorInactiveStyle: "block",
				fontSize: 14,
				fontFamily: 'Menlo, Monaco, "Courier New", monospace',
				theme: {
					background: "#0a0a0a",
					foreground: "#f0f0f0",
				},
				allowProposedApi: true,
			});

			const fitAddon = new FitAddon();
			term.loadAddon(fitAddon);

			term.onData((data) => {
				if (data === "\r") {
					// Enterキーが押された際の位置をマーカーで記録
					if (lastMarkerRef.current) {
						lastMarkerRef.current.dispose();
					}
					lastMarkerRef.current = term.registerMarker(0);
				}
				onData(data);
			});

			term.onResize((size) => {
				if (onResize) {
					onResize(size.cols, size.rows);
				}
			});

			if (onBufferChange) {
				onBufferChange(term.buffer.active.type === "alternate");
				term.onRender(() => {
					const isAlt = term.buffer.active.type === "alternate";
					onBufferChange(isAlt);
				});
			}

			if (terminalRef.current) {
				term.open(terminalRef.current);
				fitAddon.fit();
			}
			termInstanceRef.current = term;

			// --- モバイル用スクロール処理 ---
			let startY = 0;
			const handleTouchStart = (e: TouchEvent) => {
				startY = e.touches[0].pageY;
			};

			const handleTouchMove = (e: TouchEvent) => {
				if (!termInstanceRef.current) return;

				// 代替バッファ（vim/less等）使用中は、xterm側がアプリ内操作として
				// 処理を拾うべきなので、手動スクロールをスキップする選択肢もあります。
				// ここでは通常のスクロールバックがある場合のみ動作させます。
				if (termInstanceRef.current.buffer.active.type === "alternate") return;

				const currentY = e.touches[0].pageY;
				const diffY = startY - currentY;
				const lineHeight = 18; // 14px fontSize + alpha
				const linesToScroll = Math.trunc(diffY / lineHeight);

				if (linesToScroll !== 0) {
					termInstanceRef.current.scrollLines(linesToScroll);
					startY -= linesToScroll * lineHeight;
				}

				if (e.cancelable) e.preventDefault();
			};

			const container = terminalRef.current;
			if (container) {
				container.addEventListener("touchstart", handleTouchStart, {
					passive: false,
				});
				container.addEventListener("touchmove", handleTouchMove, {
					passive: false,
				});
			}
			// -----------------------------

			const resizeObserver = new ResizeObserver(() => {
				fitAddon.fit();
				if (onResize) {
					onResize(term.cols, term.rows);
				}
			});

			if (terminalRef.current) {
				resizeObserver.observe(terminalRef.current);
			}

			if (onResize) {
				setTimeout(() => {
					onResize(term.cols, term.rows);
				}, 50);
			}

			return () => {
				if (container) {
					container.removeEventListener("touchstart", handleTouchStart);
					container.removeEventListener("touchmove", handleTouchMove);
				}
				resizeObserver.disconnect();
				term.dispose();
				termInstanceRef.current = null;
			};
		}, []);

		useImperativeHandle(
			ref,
			() => ({
				write: (data) => termInstanceRef.current?.write(data),
				focus: () => termInstanceRef.current?.focus(),
				scrollToBottom: () => termInstanceRef.current?.scrollToBottom(),
				dispose: () => termInstanceRef.current?.dispose(),
				getBufferText: () => {
					if (!termInstanceRef.current) return "";
					const buffer = termInstanceRef.current.buffer.active;
					let result = "";

					// 画面上の現在のカーソル行を終点とする
					const endLine = buffer.baseY + buffer.cursorY;
					let startLine = 0;

					if (lastMarkerRef.current && !lastMarkerRef.current.isDisposed) {
						// マーカーがある場合は、その行から開始
						startLine = lastMarkerRef.current.line;
					} else {
						// マーカーがない場合は、初回接続時などコマンド未実行の状態とみなし、要約対象としない
						console.log("[TerminalOutput] getBufferText: skip (no marker set)");
						return "";
					}

					for (let i = startLine; i <= endLine; i++) {
						const line = buffer.getLine(i);
						if (line) {
							result += `${line.translateToString()}\n`;
						}
					}

					const trimmedResult = result.trim();
					console.log(
						`[TerminalOutput] getBufferText: startLine=${startLine}, endLine=${endLine}, length=${trimmedResult.length}`,
					);
					if (trimmedResult.length > 0) {
						console.log(
							`[TerminalOutput] Buffer preview (first 50): "${trimmedResult.substring(0, 50).replace(/\n/g, "\\n")}"`,
						);
						console.log(
							`[TerminalOutput] Buffer preview (last 50): "${trimmedResult.substring(Math.max(0, trimmedResult.length - 50)).replace(/\n/g, "\\n")}"`,
						);
					}

					return trimmedResult;
				},
				registerCommandMarker: () => {
					if (!termInstanceRef.current) return;
					if (lastMarkerRef.current) {
						lastMarkerRef.current.dispose();
					}
					lastMarkerRef.current = termInstanceRef.current.registerMarker(0);
					console.log(
						`[TerminalOutput] registerCommandMarker at line: ${lastMarkerRef.current?.line}`,
					);
				},
			}),
			[],
		);

		return (
			// biome-ignore lint/a11y/useKeyWithClickEvents: Terminal interaction handled internally
			// biome-ignore lint/a11y/noStaticElementInteractions: Terminal interaction handled internally
			<div
				onClick={onClick}
				style={{
					height: "100%",
					width: "100%",
					backgroundColor: "black",
					overflow: "hidden",
					position: "relative",
					touchAction: "none", // ブラウザのデフォルト挙動を抑制
				}}
			>
				<div ref={terminalRef} style={{ width: "100%", height: "100%" }} />
			</div>
		);
	},
);
