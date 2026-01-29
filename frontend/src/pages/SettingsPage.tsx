import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Type } from "lucide-react";
import styles from "./SettingsPage.module.css";
import { fetchBuildInfo, type BuildInfo } from "../services/api";

export function SettingsPage() {
	const navigate = useNavigate();
	const [aiSummaryEnabled, setAiSummaryEnabled] = useState(true);
	const [fontSize, setFontSize] = useState(14);
	const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

	// Load settings and fetch build info on mount
	useEffect(() => {
		const saved = localStorage.getItem("aiSummaryEnabled");
		if (saved !== null) {
			setAiSummaryEnabled(saved === "true");
		}

		const savedFontSize = localStorage.getItem("terminalFontSize");
		if (savedFontSize !== null) {
			setFontSize(Number.parseInt(savedFontSize, 10));
		}

		fetchBuildInfo().then(setBuildInfo);
	}, []);

	// Save to localStorage when changed
	const handleToggle = (enabled: boolean) => {
		setAiSummaryEnabled(enabled);
		localStorage.setItem("aiSummaryEnabled", String(enabled));
	};

	const handleFontSizeChange = (size: number) => {
		setFontSize(size);
		localStorage.setItem("terminalFontSize", String(size));
	};

	return (
		<div className={styles.pageContainer}>
			<div className={styles.header}>
				<button
					type="button"
					className={styles.backButton}
					onClick={() => navigate("/")}
					aria-label="戻る"
				>
					<ArrowLeft size={24} />
				</button>
				<h1 className={styles.title}>Settings</h1>
			</div>

			<div className={styles.content}>
				<div className={styles.section}>
					<div className={styles.sectionHeader}>
						<Sparkles size={20} className={styles.sectionIcon} />
						<h2 className={styles.sectionTitle}>AI Summary</h2>
					</div>

					<div className={styles.settingItem}>
						<div className={styles.settingInfo}>
							<div className={styles.settingLabel}>Enable AI Summary</div>
							<div className={styles.settingDescription}>
								Automatically summarize terminal output in Japanese
							</div>
						</div>
						<label className={styles.switch}>
							<input
								type="checkbox"
								checked={aiSummaryEnabled}
								onChange={(e) => handleToggle(e.target.checked)}
							/>
							<span className={styles.slider} />
						</label>
					</div>
				</div>

				<div className={styles.section}>
					<div className={styles.sectionHeader}>
						<Type size={20} className={styles.sectionIcon} />
						<h2 className={styles.sectionTitle}>Terminal</h2>
					</div>

					<div className={styles.settingItem}>
						<div className={styles.settingInfo}>
							<div className={styles.settingLabel}>Font Size</div>
							<div className={styles.settingDescription}>
								Terminal text size in pixels
							</div>
						</div>
						<div className={styles.selectWrapper}>
							<select
								value={fontSize}
								onChange={(e) => handleFontSizeChange(Number(e.target.value))}
								className={styles.select}
								style={{
									padding: "8px",
									borderRadius: "6px",
									border: "1px solid #333",
									backgroundColor: "#222",
									color: "#fff",
									fontSize: "14px",
								}}
							>
								{[10, 11, 12, 13, 14, 15, 16, 18, 20, 24].map((size) => (
									<option key={size} value={size}>
										{size}px
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</div>

			<div className={styles.footer}>
				<div className={styles.versionInfo}>
					{buildInfo ? (
						<>
							<div className={styles.versionValue}>
								Commit: <span>{buildInfo.commitHash}</span>
							</div>
							<div className={styles.versionValue}>
								Build:{" "}
								<span>{new Date(buildInfo.buildTime).toLocaleString()}</span>
							</div>
						</>
					) : (
						<div className={styles.versionValue}>Loading build info...</div>
					)}
				</div>
			</div>
		</div>
	);
}
