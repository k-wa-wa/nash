import styles from "./AiSummaryOverlay.module.css";
import { X, Sparkles } from "lucide-react";

interface Props {
    isOpen: boolean;
    summary: string;
    isLoading: boolean;
    onClose: () => void;
}

export function AiSummaryOverlay({ isOpen, summary, isLoading, onClose }: Props) {
    // isOpen は親から制御される

    return (
        <div className={`${styles.overlayContainer} ${isOpen ? styles.open : styles.closed}`}>
            <div className={styles.header}>
                <div className={styles.title}>
                    <Sparkles size={14} className={styles.icon} />
                    <span>Summary</span>
                </div>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.actionButton}
                        onClick={onClose}
                        aria-label="閉じる"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <span>Analyzing output...</span>
                    </div>
                ) : summary ? (
                    <div className={styles.summaryText}>
                        {summary.split("\n").map((line, i) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: lines change infrequently
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                ) : (
                    <div className={styles.summaryText}>
                        <p style={{ opacity: 0.6 }}>まだ要約がありません</p>
                    </div>
                )}
            </div>

            {/* 下部のハンドル（クリックで閉じる） */}
            <div
                className={styles.handleContainer}
                onClick={onClose}
                aria-label="閉じる"
            >
                <div className={styles.handleBar} />
            </div>
        </div>
    );
}
