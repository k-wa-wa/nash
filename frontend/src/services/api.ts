export interface SSHHost {
	Host: string;
	HostName: string;
	Port?: string;
	User?: string;
	IdentityFile?: string;
}

export type ConnectionParams = {
	host?: string;
	port?: string;
	user?: string;
	password?: string;
};

// In dev (vite proxy) or prod (same origin), utilize relative paths.
export const API_BASE = "";

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
