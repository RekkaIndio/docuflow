type CareHome = {
  id: string;
  name: string;
  region?: string;
  occupancy?: number; // 0..1
  renewalBacklog?: number;
  complianceScore?: number;
};

// Simple in-memory store for dev. Persists for the lifetime of the node process.
const homes: CareHome[] = [
  { id: 'oakview', name: 'Oakview Care Home', region: 'North', occupancy: 0.85, renewalBacklog: 5, complianceScore: 92 },
  { id: 'maplewood', name: 'Maplewood House', region: 'South', occupancy: 0.63, renewalBacklog: 12, complianceScore: 78 },
  { id: 'willow', name: 'Willow Lodge', region: 'East', occupancy: 0.92, renewalBacklog: 2, complianceScore: 97 },
];

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
