import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type React from "react";

interface Props {
	onKey: (key: string) => void;
}

export function ShortcutBar({ onKey }: Props) {
	const btnStyle = {
		padding: "0",
		background: "rgba(255, 255, 255, 0.1)",
		borderRadius: "8px",
		border: "1px solid rgba(255, 255, 255, 0.1)",
		color: "#fff",
		minWidth: "42px",
		height: "42px",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		touchAction: "manipulation",
		fontSize: "0.8rem",
		fontWeight: 600,
		cursor: "pointer",
		transition: "all 0.2s ease",
		backdropFilter: "blur(5px)",
		flexShrink: 0,
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
					padding: "10px",
					flexGrow: 1,
					scrollbarWidth: "none",
					msOverflowStyle: "none",
					maskImage: "linear-gradient(to right, black 85%, transparent 100%)", // Fade out effect
					WebkitMaskImage:
						"linear-gradient(to right, black 85%, transparent 100%)",
					alignItems: "center",
				}}
			>
				<style>{`
                    .scroll-area::-webkit-scrollbar { display: none; }
                `}</style>
				<button type="button" style={btnStyle} onClick={() => onKey("\x1b")}>
					ESC
				</button>
				<button type="button" style={btnStyle} onClick={() => onKey("\t")}>
					TAB
				</button>
				<button type="button" style={btnStyle} onClick={() => onKey("\x03")}>
					CTRL-C
				</button>
				<div
					style={{
						width: "1px",
						height: "24px",
						background: "rgba(255,255,255,0.2)",
						margin: "0 4px",
					}}
				/>
				<button type="button" style={btnStyle} onClick={() => onKey("\x1b[A")}>
					<ArrowUp size={18} />
				</button>
				<button type="button" style={btnStyle} onClick={() => onKey("\x1b[B")}>
					<ArrowDown size={18} />
				</button>
				<button type="button" style={btnStyle} onClick={() => onKey("\x1b[D")}>
					<ArrowLeft size={18} />
				</button>
				<button type="button" style={btnStyle} onClick={() => onKey("\x1b[C")}>
					<ArrowRight size={18} />
				</button>
				{/* Spacer to ensure last item is reachable despite mask */}
				<div style={{ minWidth: "20px" }} />
			</div>
		</div>
	);
}
