import type { Meta, StoryObj } from "@storybook/react";
import { VirtualKeyboard } from "./VirtualKeyboard";

const meta = {
	title: "Components/VirtualKeyboard",
	component: VirtualKeyboard,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	args: {
		onKey: () => { },
	},
} satisfies Meta<typeof VirtualKeyboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	parameters: {
		viewport: {
			defaultViewport: "iphoneSE3",
		},
	},
};

export const IPhone14Pro: Story = {
	name: "iPhone 14 Pro",
	parameters: {
		viewport: {
			defaultViewport: "iphone14pro",
		},
	},
};
