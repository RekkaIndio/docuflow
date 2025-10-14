"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useWorkspace } from "@/context/workspace";
import type { Workspace } from "@/lib/types";
import { db } from "@/lib/firebase";
import { workspaceCollectionPath, workspaceDocPath } from "@/lib/paths";

export type WorkspaceStaffMember = {
	id: string;
	name: string;
	email?: string | null;
	role?: string | null;
	source: "team" | "workspace";
	category?: string | null;
};

type UseWorkspaceStaffOptions = {
	workspace?: Workspace | null;
};

const PERSON_LIKE_KEYS = ["email", "phone", "roles", "role", "position", "department"];

const looksLikePerson = (value: any): boolean => {
	if (!value || typeof value !== "object") return false;
	const rawName = typeof value.name === "string" ? value.name : typeof value.fullName === "string" ? value.fullName : typeof value.displayName === "string" ? value.displayName : "";
	if (!rawName.trim()) return false;
	return PERSON_LIKE_KEYS.some((key) => {
		const data = value[key as keyof typeof value];
		if (typeof data === "string" && data.trim()) return true;
		if (typeof data === "number") return true;
		if (Array.isArray(data) && data.length > 0) return true;
		return false;
	});
};

const normaliseName = (value: any): string => {
	if (typeof value?.name === "string" && value.name.trim()) return value.name.trim();
	if (typeof value?.fullName === "string" && value.fullName.trim()) return value.fullName.trim();
	if (typeof value?.displayName === "string" && value.displayName.trim()) return value.displayName.trim();
	if (typeof value?.email === "string" && value.email.trim()) return value.email.trim();
	return "";
};

const deriveMemberId = (value: any, fallback: string): string => {
	if (typeof value?.id === "string" && value.id) return value.id;
	if (typeof value?.uid === "string" && value.uid) return value.uid;
	if (typeof value?.email === "string" && value.email) return value.email;
	return fallback;
};

export function useWorkspaceStaff(options: UseWorkspaceStaffOptions = {}) {
	const workspaceFromContext = useWorkspace();
	const workspace = options.workspace ?? workspaceFromContext;
	const [staff, setStaff] = useState<WorkspaceStaffMember[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		const loadStaff = async () => {
			if (!workspace?.id) {
				if (!cancelled) {
					setStaff([]);
					setError(null);
				}
				return;
			}

			setLoading(true);
			try {
				const map = new Map<string, WorkspaceStaffMember>();

				const teamsCol = collection(db, workspaceCollectionPath(workspace.id, "teams", workspace.organisationId || null));
				try {
					const teamsSnap = await getDocs(teamsCol);
					teamsSnap.forEach((teamDoc) => {
						const teamData = teamDoc.data() as any;
						const members = Array.isArray(teamData?.members) ? teamData.members : [];
						members.forEach((member: any, index: number) => {
							const name = normaliseName(member);
							if (!name) return;
							const key = name.toLowerCase();
							if (map.has(key)) return;
							map.set(key, {
								id: deriveMemberId(member, `${teamDoc.id}-${index}`),
								name,
								email: typeof member?.email === "string" ? member.email : null,
								role: typeof member?.roles === "string" ? member.roles : typeof member?.role === "string" ? member.role : null,
								source: "team",
								category: typeof teamData?.name === "string" ? teamData.name : teamDoc.id,
							});
						});
					});
				} catch (teamErr) {
					console.warn("[useWorkspaceStaff] Failed to load teams", teamErr);
				}

				try {
					const wsRef = doc(db, workspaceDocPath(workspace.id, undefined, workspace.organisationId || null));
					const wsSnap = await getDoc(wsRef);
					if (wsSnap.exists()) {
						const data = wsSnap.data() as Record<string, any>;
						Object.entries(data).forEach(([key, value]) => {
							if (!Array.isArray(value) || value.length === 0) return;
							const personEntries = value.filter(looksLikePerson);
							if (personEntries.length === 0) return;
							personEntries.forEach((entry: any, index: number) => {
								const name = normaliseName(entry);
								if (!name) return;
								const keyName = name.toLowerCase();
								if (map.has(keyName)) return;
								map.set(keyName, {
									id: deriveMemberId(entry, `${key}-${index}`),
									name,
									email: typeof entry?.email === "string" ? entry.email : null,
									role: typeof entry?.roles === "string" ? entry.roles : typeof entry?.role === "string" ? entry.role : null,
									source: "workspace",
									category: key,
								});
							});
						});
					}
				} catch (wsErr) {
					console.warn("[useWorkspaceStaff] Failed to load workspace staff arrays", wsErr);
				}

				const sorted = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
				if (!cancelled) {
					setStaff(sorted);
					setError(null);
				}
			} catch (err) {
				console.error("[useWorkspaceStaff] Unexpected error", err);
				if (!cancelled) {
					setError(err instanceof Error ? err.message : String(err));
					setStaff([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		loadStaff();

		return () => {
			cancelled = true;
		};
	}, [workspace?.id, workspace?.organisationId]);

	const metadata = useMemo(() => ({
		workspace,
		loading,
		error,
	}), [workspace, loading, error]);

	return {
		staff,
		loading,
		error,
		metadata,
	};
}

