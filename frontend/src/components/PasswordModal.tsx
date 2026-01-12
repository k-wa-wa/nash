import type React from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./PasswordModal.module.css";

interface PasswordModalProps {
    isOpen: boolean;
    onSubmit: (password: string) => void;
    onCancel: () => void;
}

export function PasswordModal({ isOpen, onSubmit, onCancel }: PasswordModalProps) {
    const [password, setPassword] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Slight delay to ensure render
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(password);
        setPassword(""); // Reset for security
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h2 className={styles.title}>Password Required</h2>
                <p className={styles.description}>
                    Authentication failed. Please enter password for this host.
                </p>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <input
                        ref={inputRef}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter SSH Password"
                        className={styles.input}
                    />
                    <div className={styles.buttons}>
                        <button type="button" onClick={onCancel} className={styles.cancelButton}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitButton}>
                            Connect
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
