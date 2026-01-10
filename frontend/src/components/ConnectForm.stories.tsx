import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { ConnectForm } from "./ConnectForm";

const meta: Meta<typeof ConnectForm> = {
	title: "Components/ConnectForm",
	component: ConnectForm,
	tags: ["autodocs"],
	args: {
		onConnect: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof ConnectForm>;

export const Default: Story = {
	args: {
		onConnect: fn(),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);

		// Simulate user input
		await userEvent.clear(canvas.getByPlaceholderText("Hostname / IP"));
		await userEvent.type(
			canvas.getByPlaceholderText("Hostname / IP"),
			"example.com",
		);

		await userEvent.clear(canvas.getByPlaceholderText("User"));
		await userEvent.type(canvas.getByPlaceholderText("User"), "testuser");

		await userEvent.click(canvas.getByRole("button", { name: /connect/i }));

		// Assert that onConnect was called with the correct arguments
		expect(args.onConnect).toHaveBeenCalledWith(
			"example.com",
			"testuser",
			"22",
			"",
		);
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
