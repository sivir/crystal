import { useMemo, useState } from "react";
import { useStaticData, APILCUChallenge } from "@/data_context";
import { challenge_icon, SortDirection, levels, get_level_color, get_progress_color } from "@/lib/utils";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, ArrowDown, ArrowUp, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePersistedState } from "@/hooks/use-persisted-state";

type ChallengeProps = {
	challenge: APILCUChallenge;
	progress: number;
	next_threshold: number;
}

function ChallengeCard({ challenge }: { challenge: ChallengeProps }) {
	const { static_data } = useStaticData();
	const [dialog_open, set_dialog_open] = useState(false);

	const has_id_list = challenge.challenge.availableIds.length > 0 || challenge.challenge.completedIds.length > 0;

	const parent_challenge = challenge.challenge.parentId ? static_data.lcu_data[challenge.challenge.parentId] : null;
	const parent_info = parent_challenge ? (() => {
		const next_level_index = levels.indexOf(parent_challenge.currentLevel) + 1;
		const next_level = next_level_index < levels.length ? levels[next_level_index] : "CHALLENGER";
		const next_threshold = parent_challenge.thresholds[next_level]?.value || parent_challenge.thresholds["MASTER"]?.value || parent_challenge.thresholds[parent_challenge.currentLevel]?.value || parent_challenge.currentValue;
		const progress = Math.min((parent_challenge.currentValue / next_threshold) * 100, 100);
		return { name: parent_challenge.name, progress, current: parent_challenge.currentValue, target: next_threshold, level: parent_challenge.currentLevel };
	})() : null;

	function get_id_name(id: number): string {
		if (challenge.challenge.idListType === "CHAMPION_SKIN") {
			return static_data.skin_map[id]?.name || String(id);
		} else if (challenge.challenge.idListType === "CHAMPION") {
			return static_data.champion_map[id]?.name || String(id);
		} else {
			return String(id);
		}
	}

	return (
		<>
			<Card
				className={`p-3 flex flex-col h-full ${has_id_list ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
				onClick={() => has_id_list && set_dialog_open(true)}
			>
				{/* Main challenge info */}
				<div className="flex gap-3 mb-2">
					<img
						src={challenge_icon(challenge.challenge)}
						alt={challenge.challenge.name}
						className="w-10 h-10 rounded-full shrink-0"
					/>
					<div className="flex flex-col min-w-0 flex-1">
						<div className={`font-semibold text-sm truncate ${get_level_color(challenge.challenge.currentLevel)}`}>
							{challenge.challenge.name}
						</div>
						<div className="text-xs text-muted-foreground line-clamp-2">
							{challenge.challenge.description}
						</div>
					</div>
					{has_id_list && (
						<List className="w-4 h-4 text-muted-foreground shrink-0" />
					)}
				</div>

				{/* Progress section */}
				<div className="mt-auto space-y-1">
					<div className="flex justify-between text-xs">
						<span className={get_level_color(challenge.challenge.currentLevel)}>{challenge.challenge.currentLevel}</span>
						<span className="text-muted-foreground">{challenge.challenge.currentValue} / {challenge.next_threshold}</span>
					</div>
					<Progress
						value={Math.min(challenge.progress, 100)}
						className="h-1.5 bg-muted"
						indicatorClassName={get_progress_color(challenge.challenge.currentLevel)}
					/>
				</div>

				{/* Parent category info */}
				{parent_info && (
					<div className="mt-3 pt-2 border-t border-border/50 space-y-1">
						<div className="flex justify-between text-xs">
							<span className={`truncate ${get_level_color(parent_info.level)}`}>{parent_info.name}</span>
							<span className="text-muted-foreground shrink-0 ml-2">{parent_info.current} / {parent_info.target}</span>
						</div>
						<Progress
							value={parent_info.progress}
							className="h-1 bg-muted"
							indicatorClassName={get_progress_color(parent_info.level)}
						/>
					</div>
				)}
			</Card>

			<Dialog open={dialog_open} onOpenChange={set_dialog_open}>
				<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle className={get_level_color(challenge.challenge.currentLevel)}>
							{challenge.challenge.name}
						</DialogTitle>
						<DialogDescription>{challenge.challenge.description}</DialogDescription>
					</DialogHeader>
					<div className="grid grid-cols-2 gap-4 overflow-y-auto flex-1">
						<div>
							<h4 className="font-semibold mb-2 text-green-400 text-sm">
								Completed ({challenge.challenge.completedIds.length})
							</h4>
							<div className="flex flex-wrap gap-1 max-h-[300px] overflow-y-auto">
								{challenge.challenge.completedIds
									.map(id => ({ id, name: get_id_name(id) }))
									.sort((a, b) => a.name.localeCompare(b.name))
									.map(({ id, name }) => (
										<span key={id} className="bg-green-900/50 text-green-200 px-2 py-0.5 rounded text-xs">
											{name}
										</span>
									))}
							</div>
						</div>
						<div>
							<h4 className="font-semibold mb-2 text-yellow-400 text-sm">
								Available ({challenge.challenge.availableIds.length})
							</h4>
							<div className="flex flex-wrap gap-1 max-h-[300px] overflow-y-auto">
								{challenge.challenge.availableIds
									.map(id => ({ id, name: get_id_name(id) }))
									.sort((a, b) => a.name.localeCompare(b.name))
									.map(({ id, name }) => (
										<span key={id} className="bg-yellow-900/50 text-yellow-200 px-2 py-0.5 rounded text-xs">
											{name}
										</span>
									))}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default function User() {
	const { static_data } = useStaticData();
	const [search, set_search] = usePersistedState("user.search", "");
	const [sort_by, set_sort_by] = usePersistedState<"name" | "progress">("user.sort_by", "progress");
	const [sort_order, set_sort_order] = usePersistedState<SortDirection>("user.sort_order", "desc");
	const [hide_masters, set_hide_masters] = usePersistedState("user.hide_masters", true);
	const [hide_legacy, set_hide_legacy] = usePersistedState("user.hide_legacy", true);
	const [hide_capstone, set_hide_capstone] = usePersistedState("user.hide_capstone", true);

	const filtered_challenges: ChallengeProps[] = useMemo(() => {
		let challenges = Object.values(static_data.lcu_data);

		if (hide_legacy) {
			challenges = challenges.filter(c => c.category !== "LEGACY");
		}

		if (search) {
			challenges = challenges.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));
		}

		if (hide_capstone) {
			challenges = challenges.filter(c => !c.isCapstone);
		}

		let props_challenges = challenges.map(c => {
			const next_level_index = levels.indexOf(c.currentLevel) + 1;
			const next_level = next_level_index < levels.length ? levels[next_level_index] : "CHALLENGER";
			const next_threshold = c.thresholds[next_level]?.value || c.thresholds["MASTER"]?.value || c.thresholds[c.currentLevel]?.value || c.currentValue;
			const progress = (c.currentValue / next_threshold) * 100;

			return {
				challenge: c,
				progress,
				next_threshold
			};
		}).sort((a, b) => {
			if (sort_by === "name") return a.challenge.name.localeCompare(b.challenge.name) * (sort_order === "asc" ? -1 : 1);
			//if (sort_by === "progress") {
				if (a.progress >= 100 && b.progress >= 100) {
					if (a.challenge.currentLevel != b.challenge.currentLevel) {
						return levels.indexOf(a.challenge.currentLevel) - levels.indexOf(b.challenge.currentLevel) * (sort_order === "asc" ? 1 : -1);
					} else {
						return a.progress - b.progress * (sort_order === "asc" ? -1 : 1);
					}
				}
				return (b.progress - a.progress) * (sort_order === "asc" ? -1 : 1);
			//}
		});

		if (hide_masters) {
			props_challenges = props_challenges.filter(c => c.challenge.pointsAwarded < 100 && c.challenge.currentValue < c.next_threshold);
		}

		return props_challenges;
	}, [static_data.lcu_data, hide_masters, hide_legacy, search, sort_by, sort_order, hide_capstone]);

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

				<Select onValueChange={(field) => { set_sort_by(field as "name" | "progress") }} value={sort_by}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="name">Name</SelectItem>
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
					<Checkbox id="hide-masters" checked={hide_masters} onCheckedChange={(checked) => set_hide_masters(checked as boolean)} />
					<Label htmlFor="hide-masters" className="text-sm cursor-pointer">
						Hide Masters+
					</Label>
				</div>

				<div className="flex items-center gap-2">
					<Checkbox id="hide-legacy" checked={hide_legacy} onCheckedChange={(checked) => set_hide_legacy(checked as boolean)}	/>
					<Label htmlFor="hide-legacy" className="text-sm cursor-pointer">
						Hide Legacy
					</Label>
				</div>

				<div className="flex items-center gap-2">
					<Checkbox id="hide-capstone" checked={hide_capstone} onCheckedChange={(checked) => set_hide_capstone(checked as boolean)}	/>
					<Label htmlFor="hide-capstone" className="text-sm cursor-pointer">
						Hide Capstones
					</Label>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
				{filtered_challenges.map(challenge => {
					return (<ChallengeCard key={challenge.challenge.id} challenge={challenge} />);
				})}
			</div>
		</div>
	);
}
