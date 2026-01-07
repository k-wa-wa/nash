export interface SSHHost {
	Host: string;
	HostName: string;
	Port?: string;
	User?: string;
	IdentityFile?: string;
}

export interface ConnectionParams {
	host: string;
	port: string;
	user: string;
	authType: "password" | "key" | "none";
	password?: string;
	privateKey?: string; // Content of the key
}

export const API_BASE = import.meta.env.DEV ? "http://localhost:8080" : "";

export async function fetchHosts(): Promise<SSHHost[]> {
	try {
		const res = await fetch(`${API_BASE}/api/hosts`);
		if (!res.ok) {
			// Fallback for demo/dev if backend not ready
			console.warn("Failed to fetch hosts, returning mock");
			return [];
		}
		return await res.json();
	} catch (e) {
		console.warn("API error", e);
		return [];
	}
}
