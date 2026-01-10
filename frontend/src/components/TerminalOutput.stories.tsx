import type { Meta, StoryObj } from "@storybook/react";
import { useEffect, useRef } from "react";
import { TerminalOutput, type TerminalOutputHandle } from "../components/TerminalOutput";

const meta = {
    title: "Components/TerminalOutput",
    component: TerminalOutput,
    parameters: {
        layout: "fullscreen",
    },
    tags: ["autodocs"],
} satisfies Meta<typeof TerminalOutput>;

export default meta;
type Story = StoryObj<typeof meta>;

const SimulatedSession = ({
    onData,
    lines = 0,
}: { onData: (data: string) => void; lines?: number }) => {
    const shellRef = useRef<TerminalOutputHandle>(null);

    useEffect(() => {
        const shell = shellRef.current;
        if (!shell) return;

        // Base interaction
        const baseSteps = [
            () => shell.write("Connecting to server...\r\n"),
            () => shell.write(`Last login: ${new Date().toLocaleString()}\r\n`),
            () => shell.write("user@nash:~$ "),
            () => shell.write("l"),
            () => shell.write("s"),
            () => shell.write(" -"),
            () => shell.write("l\r\n"),
            () =>
                shell.write(
                    "total 16\r\n-rw-r--r--  1 user  group   509 Jan  1 00:00 main.go\r\ndrwxr-xr-x  3 user  group    96 Jan  1 00:00 src\r\n"
                ),
            () => shell.write("user@nash:~$ "),
        ];

        // If lines requested, append them
        if (lines > 0) {
            baseSteps.push(() => {
                for (let i = 0; i < lines; i++) {
                    shell.write(`Line ${i + 1}: This is a long history item to test scrolling behavior.\r\n`);
                }
                shell.write("user@nash:~$ ");
            });
        }

        let step = 0;
        const interval = setInterval(() => {
            if (step < baseSteps.length) {
                baseSteps[step]();
                step++;
            } else {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [lines]);

    return (
        <div style={{ width: "100%", height: "100%" }}>
            <TerminalOutput ref={shellRef} onData={onData} />
        </div>
    );
};

export const Default: Story = {
    parameters: {
        viewport: {
            defaultViewport: "iphoneSE3",
        },
    },
    args: {
        onData: (data) => console.log("Data:", data),
        onResize: (cols, rows) => console.log("Resize:", cols, rows),
    },
    render: (args) => <SimulatedSession onData={args.onData} />,
};

export const IPhone14Pro: Story = {
    name: "iPhone 14 Pro",
    parameters: {
        viewport: {
            defaultViewport: "iphone14pro",
        },
    },
    args: {
        onData: (data) => console.log("Data:", data),
    },
    render: (args) => <SimulatedSession onData={args.onData} />,
};

export const KeyboardOpen: Story = {
    name: "Keyboard Open (Simulated)",
    parameters: {
        viewport: {
            defaultViewport: "iphoneSE3",
        },
    },
    render: (args) => (
        <div style={{ height: "40dvh", width: "100%" }}>
            <SimulatedSession {...args} />
        </div>
    ),
    args: {
        onData: (data) => console.log("Data:", data),
    },
};

export const LongOutput: Story = {
    name: "Long Output (Scrolling)",
    parameters: {
        viewport: {
            defaultViewport: "iphoneSE3",
        },
    },
    args: {
        onData: (data) => console.log("Data:", data),
    },
    render: (args) => <SimulatedSession onData={args.onData} lines={100} />,
};
