import { CornerDownLeft } from "lucide-react";
import type React from "react";
import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";

interface Props {
    value: string;
    onChange: (val: string) => void;
    onEnter: () => void;
    visible: boolean;
}

export interface CommandInputHandle {
    focus: () => void;
}

export const CommandInput = forwardRef<CommandInputHandle, Props>(({ value, onChange, onEnter, visible }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => {
            inputRef.current?.focus();
        }
    }));

    // Focus handling when becoming visible
    useEffect(() => {
        if (visible) {
            // Small timeout to allow render to complete
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [visible]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            onEnter();
        }
    };

    if (!visible) return null;

    return (
        <div
            style={{
                padding: "10px",
                background: "rgba(20, 20, 20, 0.95)",
                backdropFilter: "blur(10px)",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                zIndex: 10,
                flexShrink: 0,
            }}
        >
            <span style={{ color: "#0f0", fontWeight: "bold", userSelect: "none" }}>
                &gt;
            </span>
            <input
                ref={inputRef}
                // biome-ignore lint/a11y/noAutofocus: Intentionally used for mobile UX
                autoFocus={true} // Attempt to autofocus on mount (for iOS)
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "white",
                    outline: "none",
                    fontSize: "16px",
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    padding: 0,
                    margin: 0,
                }}
                placeholder="Type command..."
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
            />
            <button
                type="button"
                onClick={onEnter}
                // Prevent focus gathering on click/touch to keep keyboard open
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                style={{
                    background: "#3b82f6", // Blue background
                    border: "none",
                    borderRadius: "6px", // Rounded corners
                    color: "white", // White icon
                    padding: "8px 12px", // Good touch target but not too tall
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.2s",
                    opacity: 1, // Always fully visible
                }}
            >
                <CornerDownLeft size={20} />
            </button>
        </div>
    );
});
