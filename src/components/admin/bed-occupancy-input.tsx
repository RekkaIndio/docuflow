import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import OccupancyPie from '@/components/admin/occupancy-pie';
import { Building, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

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
	const [success, setSuccess] = React.useState(false);

	// Compute percent only when we have a concrete value
	const parsedTotal = totalBedsStr !== '' ? Number(totalBedsStr) : null;
	const parsedOccupied = occupiedBedsStr !== '' ? Number(occupiedBedsStr) : null;
	const percentNullable: number | null = parsedTotal && parsedTotal > 0
		? Math.round(((parsedOccupied || 0) / parsedTotal) * 100)
		: (typeof occupancy === 'number' ? Math.round((occupancy || 0) * 100) : null);

	const handleSave = async () => {
		setError(null);
		setSuccess(false);
		const total = parsedTotal ?? 0;
		const occ = parsedOccupied ?? 0;
		if (total < 0 || occ < 0) return setError('Numbers must be non-negative');
		if (occ > total) return setError('Occupied cannot exceed total');
		setSaving(true);
		try {
			await onSave(homeId, total, occ);
			setSuccess(true);
			setTimeout(() => setSuccess(false), 3000);
		} catch (e: any) {
			setError(e?.message || 'Failed to save');
		} finally {
			setSaving(false);
		}
	}

	return (
		<Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-blue-500/10 rounded-xl">
							<Building className="h-5 w-5 text-blue-500" />
						</div>
						<div>
							<div className="text-sm font-semibold text-gray-900">{homeName}</div>
							<div className="text-xs text-gray-600">ID: {homeId}</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{percentNullable !== null && (
							<div className={`text-xs font-medium px-2 py-1 rounded-full ${
								percentNullable >= 80 ? 'text-red-600 bg-red-50' :
								percentNullable >= 60 ? 'text-yellow-600 bg-yellow-50' :
								'text-green-600 bg-green-50'
							}`}>
								{percentNullable >= 80 ? 'High' :
								 percentNullable >= 60 ? 'Moderate' : 'Low'}
							</div>
						)}
						{success && <CheckCircle2 className="w-4 h-4 text-green-500" />}
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Occupancy Display */}
				<div className="flex items-center gap-4">
					<div className="w-16 h-16">
						{percentNullable !== null ? (
							<OccupancyPie
								percent={percentNullable}
								size={64}
								strokeWidth={8}
								gradientColors={{
									start: percentNullable >= 80 ? '#ef4444' :
										   percentNullable >= 60 ? '#f59e0b' : '#10b981',
									end: percentNullable >= 80 ? '#dc2626' :
										 percentNullable >= 60 ? '#d97706' : '#059669'
								}}
								centerFontSize={12}
							/>
						) : (
							<div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
								<span className="text-sm text-gray-400">--</span>
							</div>
						)}
					</div>
					<div className="flex-1">
						<div className="text-lg font-semibold text-gray-900">
							{percentNullable !== null ? `${percentNullable}%` : '--'}
						</div>
						<div className="text-sm text-gray-600">
							{parsedTotal && parsedOccupied !== null
								? `${parsedOccupied}/${parsedTotal} beds occupied`
								: 'Occupancy rate'
							}
						</div>
					</div>
				</div>

				{/* Input Fields */}
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-2">
						<Label htmlFor={`total-${homeId}`} className="text-xs text-gray-600">Total Beds</Label>
						<Input
							id={`total-${homeId}`}
							type="number"
							className="h-9"
							value={totalBedsStr}
							onChange={e => setTotalBedsStr(e.target.value)}
							disabled={isAdmin}
							placeholder="0"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={`occupied-${homeId}`} className="text-xs text-gray-600">Occupied Beds</Label>
						<Input
							id={`occupied-${homeId}`}
							type="number"
							className="h-9"
							value={occupiedBedsStr}
							onChange={e => setOccupiedBedsStr(e.target.value)}
							disabled={isAdmin}
							placeholder="0"
						/>
					</div>
				</div>

				{/* Error/Success Messages */}
				{error && (
					<div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
						<AlertCircle className="w-4 h-4" />
						{error}
					</div>
				)}

				{/* Action Button */}
				{!isAdmin && (
					<div className="flex items-center gap-2">
						<Button
							onClick={handleSave}
							disabled={saving}
							size="sm"
							className="flex items-center gap-2"
						>
							<Save className="w-4 h-4" />
							{saving ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				)}

				{isAdmin && (
					<div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
						Values are workspace-controlled and read-only here.
					</div>
				)}
			</CardContent>
		</Card>
	);
}
