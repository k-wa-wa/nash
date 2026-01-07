import type { Meta, StoryObj } from "@storybook/react";
import { VirtualKeyboard } from "../components/VirtualKeyboard";

const meta = {
	title: "Components/VirtualKeyboard",
	component: VirtualKeyboard,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof VirtualKeyboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		onKey: (key) => console.log("Key pressed:", key),
	},
};
