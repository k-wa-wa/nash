import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { HostList } from "../components/HostList";

const meta = {
	title: "Components/HostList",
	component: HostList,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	args: {
		onConnect: fn(),
	},
} satisfies Meta<typeof HostList>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockHosts = [
	{ Host: "dev-server", HostName: "192.168.1.10", User: "admin", Port: "22" },
	{
		Host: "prod-db",
		HostName: "db.example.com",
		User: "postgres",
		Port: "5432",
	},
	{ Host: "raspberry-pi", HostName: "pi.local", User: "pi", Port: "22" },
];

export const Default: Story = {
	parameters: {
		viewport: {
			defaultViewport: "iphoneSE3",
		},
	},
	args: {
		hosts: mockHosts,
	},
};

export const Empty: Story = {
	parameters: {
		viewport: {
			defaultViewport: "iphoneSE3",
		},
	},
	args: {
		hosts: [],
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
		hosts: mockHosts,
	},
};
