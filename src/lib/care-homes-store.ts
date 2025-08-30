type CareHome = {
  id: string;
  name: string;
  region?: string;
  occupancy?: number; // 0..1
  renewalBacklog?: number;
  complianceScore?: number;
};

// Simple in-memory store for dev. Persists for the lifetime of the node process.
// NOTE: demo homes removed so the Care Homes /occupancy page doesn't show placeholder/demo cards.
const homes: CareHome[] = [];

export function getHomes() {
  return homes;
}

export function getHomeById(id: string) {
  return homes.find(h => h.id === id) || null;
}

export function updateHome(id: string, patch: Partial<CareHome>) {
  const idx = homes.findIndex(h => h.id === id);
  if (idx === -1) return null;
  homes[idx] = { ...homes[idx], ...patch };
  return homes[idx];
}
