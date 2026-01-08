
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Shell } from "./Shell";

describe("Shell Component", () => {
    it("should fit within container without horizontal scrolling", async () => {
        // This test runs in browser mode via Vitest
        const screen = render(<Shell onData={() => { }} />);
        const container = screen.container.firstElementChild as HTMLElement;

        // Allow time for fit addon (though difficult to wait for exact layout calc without visual)
        await new Promise(r => setTimeout(r, 100));

        expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    });
});
