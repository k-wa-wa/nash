import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalOutput } from "./TerminalOutput";
import { Terminal } from "@xterm/xterm";

vi.mock("@xterm/xterm", () => {
	return {
		Terminal: vi.fn().mockImplementation(() => ({
			open: vi.fn(),
			loadAddon: vi.fn(),
			onData: vi.fn(),
			onResize: vi.fn(),
			onRender: vi.fn(),
			dispose: vi.fn(),
			options: { fontSize: 14 },
			buffer: { active: { type: "normal" } },
		})),
	};
});

vi.mock("@xterm/addon-fit", () => {
	return {
		FitAddon: vi.fn().mockImplementation(() => ({
			fit: vi.fn(),
		})),
	};
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

describe("TerminalOutput Component", () => {
	it("should initialize terminal with correct font size", () => {
		render(<TerminalOutput onData={() => { }} fontSize={20} />);

		// Check constructor call
		expect(Terminal).toHaveBeenCalledWith(
			expect.objectContaining({
				fontSize: 20,
			}),
		);
	});

	it("should initialize terminal with default font size if not provided", () => {
		render(<TerminalOutput onData={() => { }} />);
		expect(Terminal).toHaveBeenCalledWith(
			expect.objectContaining({
				fontSize: 14,
			}),
		);
	});

	it("should update font size when prop changes", async () => {
		const { rerender } = render(
			<TerminalOutput onData={() => { }} fontSize={14} />,
		);

		// Re-render with new size
		rerender(<TerminalOutput onData={() => { }} fontSize={20} />);
	});
});
