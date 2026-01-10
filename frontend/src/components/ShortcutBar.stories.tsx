import type { Meta, StoryObj } from "@storybook/react";
import { ShortcutBar } from "./ShortcutBar";

const meta = {
	title: "Components/ShortcutBar",
	component: ShortcutBar,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
	args: {
		onKey: () => {},
	},
} satisfies Meta<typeof ShortcutBar>;

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
