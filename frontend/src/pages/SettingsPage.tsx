import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
    const navigate = useNavigate();
    const [aiSummaryEnabled, setAiSummaryEnabled] = useState(true);

    // Load settings from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("aiSummaryEnabled");
        if (saved !== null) {
            setAiSummaryEnabled(saved === "true");
        }
    }, []);

    // Save to localStorage when changed
    const handleToggle = (enabled: boolean) => {
        setAiSummaryEnabled(enabled);
        localStorage.setItem("aiSummaryEnabled", String(enabled));
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
            </div>
        </div>
    );
}
