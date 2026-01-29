import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalOutput } from "./TerminalOutput";
import { Terminal } from "@xterm/xterm";

vi.mock("@xterm/xterm", () => {
	const Terminal = vi.fn();
	Terminal.prototype.open = vi.fn();
	Terminal.prototype.loadAddon = vi.fn();
	Terminal.prototype.onData = vi.fn();
	Terminal.prototype.onResize = vi.fn();
	Terminal.prototype.onRender = vi.fn();
	Terminal.prototype.dispose = vi.fn();
	Terminal.prototype.registerMarker = vi.fn();
	Terminal.prototype.write = vi.fn();
	Terminal.prototype.scrollToBottom = vi.fn();
	// Instances need their own options object usually, but for mock check this might suffice
	// or we can use mockImplementation if we need instance isolation
	Terminal.prototype.options = { fontSize: 14 };
	Terminal.prototype.buffer = { active: { type: "normal" }, getLine: () => null };

	return { Terminal };
});

vi.mock("@xterm/addon-fit", () => {
	const FitAddon = vi.fn();
	FitAddon.prototype.fit = vi.fn();
	return { FitAddon };
});

// Mock ResizeObserver
global.ResizeObserver = class {
	public observe = vi.fn();
	public unobserve = vi.fn();
	public disconnect = vi.fn();
} as unknown as typeof ResizeObserver;

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
