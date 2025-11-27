import { useState, useMemo } from "react";
import { useStaticData, APILCUChallenge } from "@/data_context";
import { challenge_icon } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";

const levels = ["NONE", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

function TempChallengeCard({ challenge }: { challenge: APILCUChallenge }) {
	const { static_data } = useStaticData();
	const [expanded, set_expanded] = useState(false);

	const nextLevelIndex = levels.indexOf(challenge.currentLevel) + 1;
	const nextLevel = nextLevelIndex < levels.length ? levels[nextLevelIndex] : "CHALLENGER";
	const nextThreshold = challenge.thresholds[nextLevel]?.value || challenge.currentValue;
	const progress = (challenge.currentValue / nextThreshold) * 100;

	function get_id_name(id: number) {
		if (challenge.idListType === "CHAMPION_SKIN") {
			return static_data.skin_map[id]?.name || id;
		} else if (challenge.idListType === "CHAMPION") {
			return static_data.champion_map[id]?.name || id;
		} else {
			return id;
		}
	}

	return (
		<Card className="p-4 cursor-pointer" onClick={() => set_expanded(!expanded)}>
			<div className="flex flex-col gap-4">
				<div className="flex flex-row gap-4">
					<img src={challenge_icon(challenge)} alt={challenge.name} className="w-12 h-12 rounded-full" />
					<div className="flex flex-col gap-1">
						<div className="font-bold">{challenge.name}</div>
						<span className="text-sm text-gray-400">{challenge.description}</span>
					</div>
					<div className="ml-auto flex flex-col gap-2">
						<div className="text-sm text-gray-400">{challenge.currentLevel}</div>
						<div className="text-sm text-gray-400">{challenge.currentValue} / {nextThreshold}</div>
					</div>
				</div>
				<Progress className="h-1" value={progress} />
			</div>
			{expanded && challenge.idListType != "NONE" && (
				<div className="mt-4 p-2 bg-slate-900 rounded text-sm">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<h4 className="font-bold mb-1 text-green-400">Completed IDs</h4>
							<div className="flex flex-wrap gap-1">
								{challenge.completedIds.map(id => (
									<span key={id} className="bg-green-900 text-green-200 px-1 rounded text-xs">{get_id_name(id)}</span>
								))}
							</div>
						</div>
						<div>
							<h4 className="font-bold mb-1 text-yellow-400">Available IDs</h4>
							<div className="flex flex-wrap gap-1">
								{challenge.availableIds.map(id => (
									<span key={id} className="bg-yellow-900 text-yellow-200 px-1 rounded text-xs">{get_id_name(id)}</span>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
		</Card>
	);
}

export default function User() {
	const { static_data } = useStaticData();
	const [search, set_search] = useState("");
	const [sort_by, set_sort_by] = useState<"name" | "progress" | "level">("progress");
	const [sort_order, set_sort_order] = useState<"asc" | "desc">("desc");
	const [hide_masters, set_hide_masters] = useState(false);
	const [hide_legacy, set_hide_legacy] = useState(false);

	const filteredChallenges = useMemo(() => {
		let challenges = Object.values(static_data.lcu_data);

		if (hide_masters) {
			challenges = challenges.filter(c => c.pointsAwarded < 100);
		}

		if (hide_legacy) {
			challenges = challenges.filter(c => c.category !== "LEGACY");
		}

		if (search) {
			challenges = challenges.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
		}

		return challenges.sort((a, b) => {
			if (sort_by === "name") return a.name.localeCompare(b.name) * (sort_order === "asc" ? 1 : -1);
			if (sort_by === "level") {
				 return levels.indexOf(b.currentLevel) - levels.indexOf(a.currentLevel) * (sort_order === "asc" ? 1 : -1);
			}
			return (b.currentValue - a.currentValue) * (sort_order === "asc" ? 1 : -1);
		});
	}, [static_data.lcu_data, hide_masters, search, sort_by, sort_order]);

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center gap-4 flex-wrap">
				<div className="relative">
					<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search Challenges..."
						className="pl-8 w-[200px]"
						value={search}
						onChange={(e) => set_search(e.target.value)}
					/>
				</div>

				<Select
					onValueChange={(field) => {
						set_sort_by(field as "name" | "level" | "progress");
					}}
					value={sort_by}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="name">Name</SelectItem>
						<SelectItem value="level">Level</SelectItem>
						<SelectItem value="progress">Progress</SelectItem>
					</SelectContent>
				</Select>

				<Button
					variant="outline"
					size="icon"
					onClick={() => {
						set_sort_order(prev => prev === 'asc' ? 'desc' : 'asc');
					}}
					title={`Sort ${sort_order === 'asc' ? 'Ascending' : 'Descending'}`}
				>
					{sort_order === 'asc' ? (
						<ArrowUp className="h-4 w-4" />
					) : (
						<ArrowDown className="h-4 w-4" />
					)}
				</Button>

				<div className="flex items-center gap-2">
					<Checkbox
						id="hide-masters"
						checked={hide_masters}
						onCheckedChange={(checked) => set_hide_masters(checked as boolean)}
					/>
					<Label htmlFor="hide-masters" className="text-sm cursor-pointer">
						Hide masters+
					</Label>
				</div>

				<div className="flex items-center gap-2">
					<Checkbox
						id="hide-legacy"
						checked={hide_legacy}
						onCheckedChange={(checked) => set_hide_legacy(checked as boolean)}
					/>
					<Label htmlFor="hide-legacy" className="text-sm cursor-pointer">
						Hide legacy
					</Label>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-2">
				{filteredChallenges.map(challenge => {
					return (<TempChallengeCard key={challenge.id} challenge={challenge} />);
				})}
			</div>
		</div>
	);
}
