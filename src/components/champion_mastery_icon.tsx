import { cn, mastery_icon_color } from "@/lib/utils";
import { APIMasteryDataEntry } from "@/data_context";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ChampionDetailCard } from "@/components/champion_detail_card";

interface ChampionMasteryIconProps {
	data: APIMasteryDataEntry;
	className?: string;
}

export function ChampionMasteryIcon({ data, className }: ChampionMasteryIconProps) {
	const totalPointsNeeded = data.championPointsSinceLastLevel + Math.max(0, data.championPointsUntilNextLevel);
	const progress = totalPointsNeeded > 0 ? (data.championPointsSinceLastLevel / totalPointsNeeded) * 100 : 100;

	return (
		<HoverCard openDelay={150} closeDelay={0}>
			<HoverCardTrigger asChild>
				<div className={cn("relative inline-block w-16 h-16 cursor-pointer", className)}>
					<div className="relative overflow-hidden rounded-md w-full h-full">
						<img 
							src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${data.championId}.png`} 
							alt={`Champion ${data.championId}`} 
							className="w-full h-full object-cover"
						/>
						
						<div className="absolute bottom-0 left-0 w-full h-[10%] bg-black/50">
							<div 
								className="h-full bg-blue-400 transition-all duration-300"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</div>

					<div className={cn("absolute -bottom-1 -left-1 flex items-center justify-center w-5 h-5 rounded-md text-xs font-bold text-white border-2 border-background shadow-sm", mastery_icon_color(data.championLevel))}>
						{data.championLevel}
					</div>
				</div>
			</HoverCardTrigger>
			<HoverCardContent className="w-auto p-4" side="right" align="start">
				<ChampionDetailCard champion_id={data.championId} />
			</HoverCardContent>
		</HoverCard>
	);
}
