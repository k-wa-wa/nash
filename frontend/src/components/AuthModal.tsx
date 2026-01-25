import type React from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
	isOpen: boolean;
	title?: string;
	description?: string;
	promptLabel?: string;
	isPassword?: boolean;
	showInput?: boolean;
	onSubmit: (value: string) => void;
	onCancel: () => void;
}

export function AuthModal({
	isOpen,
	title = "Password Required",
	description = "Authentication failed. Please enter password for this host.",
	promptLabel = "Password",
	isPassword = true,
	showInput = true,
	onSubmit,
	onCancel,
}: AuthModalProps) {
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen && showInput) {
			// Slight delay to ensure render
			setTimeout(() => {
				inputRef.current?.focus();
			}, 50);
		}
	}, [isOpen, showInput]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(value);
		setValue(""); // Reset for security
	};

	return (
		<div className={styles.overlay}>
			<div className={styles.modal}>
				<h2 className={styles.title}>{title}</h2>
				<p className={styles.description}>{description}</p>
				<form onSubmit={handleSubmit} className={styles.form}>
					{showInput && (
						<input
							ref={inputRef}
							type={isPassword ? "password" : "text"}
							value={value}
							onChange={(e) => setValue(e.target.value)}
							placeholder={`Enter ${promptLabel}`}
							className={styles.input}
							autoComplete="off"
						/>
					)}
					<div className={styles.buttons}>
						<button
							type="button"
							onClick={onCancel}
							className={styles.cancelButton}
						>
							Cancel
						</button>
						<button type="submit" className={styles.submitButton}>
							Submit
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
