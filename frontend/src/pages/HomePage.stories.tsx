import type { Meta, StoryObj } from "@storybook/react";
import { BrowserRouter } from "react-router-dom";
import { HomePage } from "./HomePage";

const meta: Meta<typeof HomePage> = {
	title: "Pages/HomePage",
	component: HomePage,
	decorators: [
		(Story) => (
			<BrowserRouter>
				<Story />
			</BrowserRouter>
		),
	],
	parameters: {
		layout: "fullscreen",
		viewport: {
			defaultViewport: "mobile1",
		},
	},
};

export default meta;
type Story = StoryObj<typeof HomePage>;

export const Default: Story = {};

export const Mobile: Story = {
	parameters: {
		viewport: {
			defaultViewport: "iphone12",
		},
	},
};
