import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import React, { useEffect, useImperativeHandle, useRef } from "react";
import { VirtualKeyboard } from "./VirtualKeyboard";

export interface ShellHandle {
    write: (data: string | Uint8Array) => void;
    focus: () => void;
    dispose: () => void;
}

interface Props {
    onData: (data: string) => void;
    onResize?: (cols: number, rows: number) => void;
}

export const Shell = React.forwardRef<ShellHandle, Props>(
    ({ onData, onResize }, ref) => {
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
            []
        );

        const handleVirtualKey = (key: string) => {
            onData(key);
            termInstanceRef.current?.focus();
        };

        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    width: "100%",
                    backgroundColor: "black",
                    overflow: "hidden",
                }}
            >
                {/* Terminal Container: Fills available space above keyboard */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    <div ref={terminalRef} style={{ width: "100%", height: "100%" }} />
                </div>

                {/* Keyboard controls area */}
                <div style={{ flexShrink: 0, width: "100%" }}>
                    <VirtualKeyboard onKey={handleVirtualKey} />
                </div>
            </div>
        );
    }
);
