export function computeStaffAggregate(ws: any): number | string | null {
  if (!ws) return null;
  try {
    const membersSet = new Set<string>();
    const collect = (arr: any) => {
      if (!arr) return;
      if (!Array.isArray(arr)) return;
      for (const m of arr) {
        if (!m) continue;
        if (typeof m === 'string') membersSet.add(m);
        else if (typeof m === 'object') {
          if (m.id) membersSet.add(String(m.id));
          else if (m.email) membersSet.add(String(m.email));
          else if (m.userId) membersSet.add(String(m.userId));
          else membersSet.add(JSON.stringify(m));
        }
      }
    };

    collect(ws.members);
    const candidateFields = ['managers','nurses','ctms','domestics','maintenances','kitchens','activities','staff','staffMembers'];
    for (const f of candidateFields) collect(ws[f]);

    if (membersSet.size > 0) return membersSet.size;
    if (typeof ws.staffCount === 'number') return ws.staffCount;
    if (typeof ws.staffingLevel === 'number') return `${ws.staffingLevel}%`;
    return null;
  } catch (e) {
    return null;
  }
}
