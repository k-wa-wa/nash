
import type { Meta, StoryObj } from "@storybook/react";
import { ConnectForm } from "../components/ConnectForm";

const meta = {
    title: "Components/ConnectForm",
    component: ConnectForm,
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
} satisfies Meta<typeof ConnectForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    parameters: {
        viewport: {
            defaultViewport: "iphoneSE3",
        },
    },
    args: {
        onConnect: (host, user, port) => console.log("Connect:", host, user, port),
    },
};

export const IPhone14Pro: Story = {
    name: "iPhone 14 Pro",
    parameters: {
        viewport: {
            defaultViewport: "iphone14pro",
        },
    },
    args: {
        onConnect: (host, user, port) => console.log("Connect:", host, user, port),
    },
};
