import { cn } from "@/lib/utils";
import { APIMasteryDataEntry } from "@/data_context";

interface ChampionMasteryIconProps {
	data: APIMasteryDataEntry;
	className?: string;
}

const mastery_colors: { [key: number]: string } = {
	10: "bg-red-500",
	9: "bg-orange-500",
	8: "bg-purple-500",
	7: "bg-blue-500",
	6: "bg-green-500",
	5: "bg-gray-500"
};

function getMasteryColor(level: number): string {
	if (level >= 10) {
		return mastery_colors[10];
	}
	return mastery_colors[level] || "bg-gray-500";
}

export function ChampionMasteryIcon({ data, className }: ChampionMasteryIconProps) {
	const totalPointsNeeded = data.championPointsSinceLastLevel + Math.max(0, data.championPointsUntilNextLevel);
	const progress = totalPointsNeeded > 0 ? (data.championPointsSinceLastLevel / totalPointsNeeded) * 100 : 100;

	return (
		<div className={cn("relative inline-block w-16 h-16", className)}>
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

			<div className={cn("absolute -bottom-1 -left-1 flex items-center justify-center w-5 h-5 rounded-md text-xs font-bold text-white border-2 border-background shadow-sm", getMasteryColor(data.championLevel))}>
				{data.championLevel}
			</div>
		</div>
	);
}
