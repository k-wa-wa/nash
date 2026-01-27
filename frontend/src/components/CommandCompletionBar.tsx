import type React from "react";
import type { Suggestion } from "../utils/SuggestionEngine";

interface Props {
    suggestions: Suggestion[];
    onSelect: (suggestion: Suggestion) => void;
}

export function CommandCompletionBar({ suggestions, onSelect }: Props) {
    if (suggestions.length === 0) return null;

    const getStyle = (type: "history" | "static"): React.CSSProperties => ({
        padding: "4px 8px",
        background:
            type === "history"
                ? "rgba(0, 122, 255, 0.2)"
                : "rgba(52, 199, 89, 0.2)", // Blue for history, Green for static
        borderRadius: "6px",
        border:
            type === "history"
                ? "1px solid rgba(0, 122, 255, 0.3)"
                : "1px solid rgba(52, 199, 89, 0.3)",
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
    });

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
                {suggestions.map((s) => (
                    <button
                        key={`${s.type}-${s.text}`}
                        type="button"
                        style={getStyle(s.type)}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect(s);
                        }}
                    >
                        {s.text}
                    </button>
                ))}
                <div style={{ minWidth: "20px" }} />
            </div>
        </div>
    );
}
