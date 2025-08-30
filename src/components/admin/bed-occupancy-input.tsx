import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OccupancyPie from '@/components/admin/occupancy-pie';

type BedOccupancyInputProps = {
	homeId: string;
	homeName: string;
	initialTotalBeds?: number;
	initialOccupiedBeds?: number;
	occupancy?: number; // 0..1
	isAdmin?: boolean; // read-only when true
	onSave: (homeId: string, totalBeds: number, occupiedBeds: number) => Promise<void>;
};

export default function BedOccupancyInput({ homeId, homeName, initialTotalBeds, initialOccupiedBeds, occupancy, isAdmin, onSave }: BedOccupancyInputProps) {
	// Keep inputs as strings so empty means "no value provided" instead of defaulting to 0
	const [totalBedsStr, setTotalBedsStr] = React.useState<string>(
		initialTotalBeds !== undefined && initialTotalBeds !== null ? String(initialTotalBeds) : ''
	);
	const [occupiedBedsStr, setOccupiedBedsStr] = React.useState<string>(
		initialOccupiedBeds !== undefined && initialOccupiedBeds !== null ? String(initialOccupiedBeds) : ''
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	// Compute percent only when we have a concrete value
	const parsedTotal = totalBedsStr !== '' ? Number(totalBedsStr) : null;
	const parsedOccupied = occupiedBedsStr !== '' ? Number(occupiedBedsStr) : null;
	const percentNullable: number | null = parsedTotal && parsedTotal > 0
		? Math.round(((parsedOccupied || 0) / parsedTotal) * 100)
		: (typeof occupancy === 'number' ? Math.round((occupancy || 0) * 100) : null);

	const handleSave = async () => {
		setError(null);
		const total = parsedTotal ?? 0;
		const occ = parsedOccupied ?? 0;
		if (total < 0 || occ < 0) return setError('Numbers must be non-negative');
		if (occ > total) return setError('Occupied cannot exceed total');
		setSaving(true);
		try {
			await onSave(homeId, total, occ);
		} catch (e: any) {
			setError(e?.message || 'Failed to save');
		} finally {
			setSaving(false);
		}
	}

	return (
			<Card className="border">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<div className="text-sm font-medium">{homeName}</div>
							<div className="text-xs text-muted-foreground">ID: {homeId}</div>
					</div>
					<div className="flex items-center gap-4">
						<div className="flex flex-col items-end">
							<div className="text-sm font-semibold">{percentNullable !== null ? `${percentNullable}%` : '--'}</div>
							<div className="text-xs text-muted-foreground">occupied</div>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
					<div className="flex items-center gap-4">
						<div className="w-24">
							<OccupancyPie percent={percentNullable} />
						</div>
						<div className="flex-1 grid grid-cols-2 gap-3">
							<div>
								<label className="text-xs text-muted-foreground">Total beds</label>
								<input
									type="number"
									className="w-full border rounded px-2 py-1"
									value={totalBedsStr}
									onChange={e => setTotalBedsStr(e.target.value)}
									disabled={isAdmin}
								/>
							</div>
							<div>
								<label className="text-xs text-muted-foreground">Occupied beds</label>
								<input
									type="number"
									className="w-full border rounded px-2 py-1"
									value={occupiedBedsStr}
									onChange={e => setOccupiedBedsStr(e.target.value)}
									disabled={isAdmin}
								/>
							</div>
						</div>
					</div>
				{error && <div className="text-xs text-destructive">{error}</div>}
					{!isAdmin && (
						<div className="flex items-center gap-2">
							<Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
						</div>
					)}
					{isAdmin && (
						<div className="text-xs text-muted-foreground">Values are workspace-controlled and read-only here.</div>
					)}
			</CardContent>
		</Card>
	);
}
