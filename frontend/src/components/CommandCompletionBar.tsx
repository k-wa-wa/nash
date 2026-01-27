import type React from "react";

interface Props {
    commands: string[];
    onSelect: (cmd: string) => void;
}

export function CommandCompletionBar({ commands, onSelect }: Props) {
    if (commands.length === 0) return null;

    const btnStyle = {
        padding: "4px 8px",
        background: "rgba(0, 122, 255, 0.2)", // Different color from ShortcutBar (bluish)
        borderRadius: "6px",
        border: "1px solid rgba(0, 122, 255, 0.3)",
        color: "#fff",
        minWidth: "auto",
        height: "32px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        touchAction: "manipulation",
        fontSize: "0.75rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s ease",
        backdropFilter: "blur(5px)",
        flexShrink: 0,
        whiteSpace: "nowrap",
    } as React.CSSProperties;

    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                background: "rgba(20, 20, 20, 0.95)",
                backdropFilter: "blur(10px)",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                boxSizing: "border-box",
            }}
        >
            {/* Scrollable Area */}
            <div
                className="scroll-area"
                style={{
                    display: "flex",
                    gap: "8px",
                    overflowX: "auto",
                    padding: "6px 8px",
                    flexGrow: 1,
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    maskImage: "linear-gradient(to right, black 85%, transparent 100%)",
                    WebkitMaskImage:
                        "linear-gradient(to right, black 85%, transparent 100%)",
                    alignItems: "center",
                    minHeight: "44px",
                }}
            >
                <style>{`
                    .scroll-area::-webkit-scrollbar { display: none; }
                `}</style>
                {commands.map((cmd) => (
                    <button
                        key={cmd}
                        type="button"
                        style={btnStyle}
                        onClick={() => onSelect(cmd)}
                    >
                        {cmd}
                    </button>
                ))}
                {/* Spacer */}
                <div style={{ minWidth: "20px" }} />
            </div>
        </div>
    );
}
