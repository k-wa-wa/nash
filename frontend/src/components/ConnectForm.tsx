import type React from "react";
import { useState } from "react";
import styles from "./ConnectForm.module.css";

interface ConnectFormProps {
	onConnect: (
		host: string,
		user: string,
		port: string,
		pass?: string,
		identityFile?: string,
		identityKey?: string,
	) => void;
}

export function ConnectForm({ onConnect }: ConnectFormProps) {
	const [host, setHost] = useState(import.meta.env.VITE_SSH_HOST || "");
	const [user, setUser] = useState(import.meta.env.VITE_SSH_USER || "");
	const [port, setPort] = useState(import.meta.env.VITE_SSH_PORT || "22");
	const [pass, setPass] = useState(import.meta.env.VITE_SSH_PASS || "");
	const [identityKey, setIdentityKey] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// identityFile is undefined when using manual form, identityKey is passed if file selected
		onConnect(host, user, port, pass, undefined, identityKey);
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			setIdentityKey("");
			return;
		}

		try {
			const text = await file.text();
			setIdentityKey(text);
		} catch (err) {
			console.error("Failed to read file", err);
			alert("Failed to read key file");
		}
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
			<div className={styles.fileInputWrapper}>
				<label htmlFor="key-file-upload" className={styles.fileLabel}>
					Private Key (Optional)
				</label>
				<input
					id="key-file-upload"
					type="file"
					onChange={handleFileChange}
					className={styles.fileInput}
				/>
			</div>
			<button type="submit" className={styles.connectButton}>
				Connect
			</button>
		</form>
	);
}
