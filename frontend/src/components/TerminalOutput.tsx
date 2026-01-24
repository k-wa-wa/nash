import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import React, { useEffect, useImperativeHandle, useRef } from "react";

export interface TerminalOutputHandle {
	write: (data: string | Uint8Array) => void;
	focus: () => void;
	dispose: () => void;
}

interface Props {
	onData: (data: string) => void;
	onResize?: (cols: number, rows: number) => void;
	onBufferChange?: (isAlternate: boolean) => void;
}

export const TerminalOutput = React.forwardRef<TerminalOutputHandle, Props>(
	({ onData, onResize, onBufferChange }, ref) => {
		const terminalRef = useRef<HTMLDivElement>(null);
		const termInstanceRef = useRef<Terminal | null>(null);

		// biome-ignore lint/correctness/useExhaustiveDependencies: Setup once
		useEffect(() => {
			const term = new Terminal({
				cursorBlink: true,
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
				container.addEventListener("touchstart", handleTouchStart, { passive: false });
				container.addEventListener("touchmove", handleTouchMove, { passive: false });
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
				dispose: () => termInstanceRef.current?.dispose(),
			}),
			[],
		);

		return (
			<div
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