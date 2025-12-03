import { useMemo } from "react";
import { useStaticData, default_mastery_data } from "@/data_context";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Check, X } from "lucide-react";
import { challenge_icon, mastery_color } from "@/lib/utils";

const tracked_challenges = [101301, 120002, 202303, 210001, 210002, 401106, 505001, 602002, 602001];

export function ChampionDetailCard({ champion_id }: { champion_id: number }) {
	const { static_data, has_lcu_data } = useStaticData();

	const champion = static_data.champion_map[champion_id];
	const mastery_data = useMemo(() => 
		static_data.mastery_data.find(m => m.championId === champion_id) || default_mastery_data,
		[static_data.mastery_data, champion_id]
	);

	const eternals_series_data = useMemo(() => {
		const eternals = static_data.eternals_map.get(champion_id) || [];
		if (eternals.length === 0) return { series: [], totalProgress: 0 };

		const series = eternals.map(series => {
			const metadataSet = static_data.statstones_map[series.itemId.toString()];
			let seriesProgress = 0;

			series.statstones.forEach((statstone, index) => {
				const metadata = metadataSet?.statstones[index];
				const targetValue = metadata?.milestones.slice(0, 5).reduce((sum, val) => sum + val, 0) || 0;
				const currentValue = statstone.playerRecord?.value || 0;

				const eternalProgress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
				seriesProgress += eternalProgress;
			});

			// Average progress across all eternals in the series
			const avgSeriesProgress = series.statstones.length > 0 ? seriesProgress / series.statstones.length : 0;

			return {
				name: series.name,
				stonesOwned: series.stonesOwned || 0,
				totalStones: series.statstones.length,
				progress: avgSeriesProgress
			};
		});

		// Average progress across all series
		const totalProgress = series.length > 0 
			? series.reduce((sum, s) => sum + s.progress, 0) / series.length 
			: 0;

		return { series, totalProgress };
	}, [static_data.eternals_map, static_data.statstones_map, champion_id]);

	const skins_owned = useMemo(() => 
		static_data.minimal_skins.filter(s => s.championId === champion_id && s.ownership.owned).length,
		[static_data.minimal_skins, champion_id]
	);

	const total_skins = useMemo(() => 
		static_data.minimal_skins.filter(s => s.championId === champion_id).length,
		[static_data.minimal_skins, champion_id]
	);

	const challenges_completed = useMemo(() => 
		has_lcu_data ? tracked_challenges.map(id => ({
			id,
			name: static_data.lcu_data[id]?.name || "",
			completed: static_data.lcu_data[id]?.completedIds.includes(champion_id) || false,
			icon: challenge_icon(static_data.lcu_data[id], id)
		})) : [],
		[static_data.lcu_data, champion_id, has_lcu_data]
	);

	const harmony_challenges = useMemo(() => 
		has_lcu_data ? Object.values(static_data.lcu_data)
			.filter(c => c.capstoneGroupName === "Harmony" && !c.isCapstone && c.availableIds.includes(champion_id))
			.map(c => ({ id: c.id, name: c.name, icon: challenge_icon(c, c.id) }))
			: [],
		[static_data.lcu_data, champion_id, has_lcu_data]
	);

	const globetrotter_challenges = useMemo(() => 
		has_lcu_data ? Object.values(static_data.lcu_data)
			.filter(c => c.capstoneGroupName === "Globetrotter" && !c.isCapstone && c.availableIds.includes(champion_id))
			.map(c => ({ id: c.id, name: c.name, icon: challenge_icon(c, c.id) }))
			: [],
		[static_data.lcu_data, champion_id, has_lcu_data]
	);

	const totalPointsNeeded = mastery_data.championPointsSinceLastLevel + mastery_data.championPointsUntilNextLevel;
	const progress = totalPointsNeeded > 0 ? (mastery_data.championPointsSinceLastLevel / totalPointsNeeded) * 100 : 100;

	if (!champion) {
		return <div className="p-4 text-sm text-muted-foreground">Champion data not found</div>;
	}

	return (
		<div className="w-80 space-y-3">
			{/* Champion Header */}
			<div className="flex items-center gap-3">
				<img 
					src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champion_id}.png`}
					alt={champion.name}
					className="w-12 h-12 rounded-md"
				/>
				<div className="flex-1">
					<h3 className="font-semibold text-base">{champion.name}</h3>
					<div className="flex gap-1 flex-wrap">
						{champion.roles.map((role, i) => (
							<Badge key={i} variant="outline" className="text-xs">{role}</Badge>
						))}
					</div>
				</div>
			</div>

			<Separator />

			{/* Mastery Section */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">Mastery</span>
					<Badge className={mastery_color(mastery_data.championLevel)}>
						Level {mastery_data.championLevel}
					</Badge>
				</div>
				<div className="space-y-1">
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>{mastery_data.championPoints.toLocaleString()} points</span>
						<span>{mastery_data.championPointsSinceLastLevel.toLocaleString()} / {totalPointsNeeded.toLocaleString()}</span>
					</div>
					<Progress value={progress} className="h-1.5" />
				</div>
			</div>

			{/* Eternals Section */}
			<>
				<Separator />
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Eternals</span>
						{eternals_series_data.series.length > 0 && (
							<span className="text-xs text-muted-foreground">{eternals_series_data.totalProgress.toFixed(1)}%</span>
						)}
					</div>
					{eternals_series_data.series.length > 0 ? (
						<div className="grid grid-cols-3 gap-2">
							{eternals_series_data.series.map((series, i) => (
								<div key={i} className="space-y-1">
									<div className="text-xs text-muted-foreground truncate" title={series.name}>
										{series.name.replace('Eternals ', '')}
									</div>
									<Progress value={series.progress} className="h-1.5" />
									<div className="text-xs text-muted-foreground text-center">
										{series.progress.toFixed(0)}%
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-xs text-muted-foreground">Not Owned</div>
					)}
				</div>
			</>

			{/* Skins Section */}
			{total_skins > 0 && (
				<>
					<Separator />
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Skins Owned</span>
						<span className="text-sm text-muted-foreground">{skins_owned} / {total_skins}</span>
					</div>
				</>
			)}

			{/* Challenges Section */}
			{has_lcu_data && challenges_completed.length > 0 && (
				<>
					<Separator />
					<div className="space-y-2">
						<span className="text-sm font-medium">Challenges</span>
						<div className="grid grid-cols-3 gap-1">
							{challenges_completed.map((challenge) => (
								<div 
									key={challenge.id} 
									className="flex items-center gap-1"
									title={challenge.name}
								>
									{challenge.completed ? (
										<Check className="h-3 w-3 text-green-500" />
									) : (
										<X className="h-3 w-3 text-muted-foreground" />
									)}
									<img src={challenge.icon} alt="" className="w-4 h-4" />
								</div>
							))}
						</div>
					</div>
				</>
			)}

			{/* Harmony & Globetrotter Challenges */}
			{(harmony_challenges.length > 0 || globetrotter_challenges.length > 0) && (
				<>
					<Separator />
					<div className="grid grid-cols-2 gap-3">
						{/* Harmony */}
						<div className="space-y-1.5">
							<span className="text-sm font-medium">Harmony</span>
							{harmony_challenges.length > 0 ? (
								<div className="flex flex-wrap gap-1">
									{harmony_challenges.map((challenge) => (
										<div key={challenge.id} title={challenge.name}>
											<img src={challenge.icon} alt={challenge.name} className="w-5 h-5" />
										</div>
									))}
								</div>
							) : (
								<div className="text-xs text-muted-foreground">None</div>
							)}
						</div>
						
						{/* Globetrotter */}
						<div className="space-y-1.5">
							<span className="text-sm font-medium">Globetrotter</span>
							{globetrotter_challenges.length > 0 ? (
								<div className="flex flex-wrap gap-1">
									{globetrotter_challenges.map((challenge) => (
										<div key={challenge.id} title={challenge.name}>
											<img src={challenge.icon} alt={challenge.name} className="w-5 h-5" />
										</div>
									))}
								</div>
							) : (
								<div className="text-xs text-muted-foreground">None</div>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
