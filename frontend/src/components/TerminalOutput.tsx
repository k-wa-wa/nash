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

			// Monitor buffer changes (Normal vs Alternate)
			if (onBufferChange) {
				// Initial check
				onBufferChange(term.buffer.active.type === "alternate");

				term.onRender(() => {
					// Check if buffer type changed
					const isAlt = term.buffer.active.type === "alternate";
					onBufferChange(isAlt);
				});
			}

			if (terminalRef.current) {
				term.open(terminalRef.current);
				fitAddon.fit();
			}
			termInstanceRef.current = term;

			const resizeObserver = new ResizeObserver(() => {
				fitAddon.fit();
				// Trigger resize event after fit
				if (onResize) {
					onResize(term.cols, term.rows);
				}
			});

			if (terminalRef.current) {
				resizeObserver.observe(terminalRef.current);
			}

			// Initial resize notification
			if (onResize) {
				setTimeout(() => {
					onResize(term.cols, term.rows);
				}, 50);
			}

			return () => {
				resizeObserver.disconnect();
				term.dispose();
				termInstanceRef.current = null;
			};
		}, []);

		useImperativeHandle(
			ref,
			() => ({
				write: (data) => {
					if (termInstanceRef.current) {
						termInstanceRef.current.write(data);
					}
				},
				focus: () => {
					if (termInstanceRef.current) {
						termInstanceRef.current.focus();
					}
				},
				dispose: () => {
					if (termInstanceRef.current) {
						termInstanceRef.current.dispose();
					}
				},
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
				}}
			>
				<div ref={terminalRef} style={{ width: "100%", height: "100%" }} />
			</div>
		);
	},
);
