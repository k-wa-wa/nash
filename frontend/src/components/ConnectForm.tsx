import type React from "react";
import { useState } from "react";
import styles from "./ConnectForm.module.css";

interface ConnectFormProps {
	onConnect: (host: string, user: string, port: string, pass?: string) => void;
}

export function ConnectForm({ onConnect }: ConnectFormProps) {
	const [host, setHost] = useState(import.meta.env.VITE_SSH_HOST || "");
	const [user, setUser] = useState(import.meta.env.VITE_SSH_USER || "");
	const [port, setPort] = useState(import.meta.env.VITE_SSH_PORT || "22");
	const [pass, setPass] = useState(import.meta.env.VITE_SSH_PASS || "");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onConnect(host, user, port, pass);
	};

	return (
		<form onSubmit={handleSubmit} className={styles.form}>
			<input
				placeholder="Hostname / IP"
				value={host}
				onChange={(e) => setHost(e.target.value)}
				required
			/>
			<div className={styles.inputGrid}>
				<input
					placeholder="User"
					value={user}
					onChange={(e) => setUser(e.target.value)}
					required
				/>
				<input
					placeholder="Port"
					type="number"
					value={port}
					onChange={(e) => setPort(e.target.value)}
				/>
			</div>
			<input
				placeholder="Password (Optional)"
				type="password"
				value={pass}
				onChange={(e) => setPass(e.target.value)}
			/>
			<button type="submit" className={styles.connectButton}>
				Connect
			</button>
		</form>
	);
}
