import { ArrowRight } from "lucide-react";
import styles from "./HostList.module.css";

export interface SSHHost {
	Host: string;
	HostName: string;
	User?: string;
	Port?: string;
}

interface HostListProps {
	hosts: SSHHost[];
	onConnect: (host: SSHHost) => void;
}

export function HostList({ hosts, onConnect }: HostListProps) {
	if (hosts.length === 0) {
		return <p style={{ opacity: 0.5 }}>No hosts found in ssh_config</p>;
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
			{hosts.map((host) => (
				<button
					type="button"
					key={host.Host}
					className={styles.hostButton}
					onClick={() => onConnect(host)}
					onKeyDown={(e) =>
						(e.key === "Enter" || e.key === " ") && onConnect(host)
					}
				>
					<div>
						<div className={styles.hostInfo}>{host.Host}</div>
						<div className={styles.hostDetails}>
							<span className={styles.userPrefix}>{host.User || "root"}@</span>
							{host.HostName}
						</div>
					</div>
					<ArrowRight size={20} className={styles.arrowIcon} />
				</button>
			))}
		</div>
	);
}
