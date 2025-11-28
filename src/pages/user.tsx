import { useState, useMemo } from "react";
import { useStaticData, APILCUChallenge } from "@/data_context";
import { challenge_icon, SortDirection } from "@/lib/utils";

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

// TODO: take everything out of challenge, keep only what's needed
type ChallengeProps = {
	challenge: APILCUChallenge;
	progress: number;
	next_threshold: number;
}

type Note = {
	type: "good" | "bug" | "info";
	text: string;
}

// incomplete, need to make sure info is right this is just for proof of concept
const challenge_notes: Record<number, Note[]> = {
	302201: [
		{
			type: "bug",
			text: "The herald has to survive until both turrets are destroyed, and you cannot ride it!"
		}
	],
	301302: [
		{
			type: "info",
			text: "You actually have to avoid getting kills, dying is fine!"
		}
	],
	203409: [
		{
			type: "good",
			text: "Stealing 2/3 grubs counts!"
		}
	]
}

function TempChallengeCard({ challenge }: { challenge: ChallengeProps }) {
	const { static_data } = useStaticData();
	const [expanded, set_expanded] = useState(false);

	function get_id_name(id: number) {
		if (challenge.challenge.idListType === "CHAMPION_SKIN") {
			return static_data.skin_map[id]?.name || id;
		} else if (challenge.challenge.idListType === "CHAMPION") {
			return static_data.champion_map[id]?.name || id;
		} else {
			return id;
		}
	}

	return (
		<Card className="p-4 cursor-pointer" onClick={() => set_expanded(!expanded)}>
			<div className="flex flex-col gap-4">
				<div className="flex flex-row gap-4">
					<img src={challenge_icon(challenge.challenge)} alt={challenge.challenge.name} className="w-12 h-12 rounded-full" />
					<div className="flex flex-col gap-1">
						<div className="font-bold">{challenge.challenge.name} ({challenge.challenge.id})</div>
						<span className="text-sm text-gray-400">{challenge.challenge.description}</span>
					</div>
					<div className="ml-auto flex flex-col gap-2">
						<div className="text-sm text-gray-400">{challenge.challenge.currentLevel}</div>
						<div className="text-sm text-gray-400">{challenge.challenge.currentValue} / {challenge.next_threshold}</div>
					</div>
				</div>
				<Progress className="h-1" value={challenge.progress} />
			</div>
			{expanded && challenge.challenge.idListType != "NONE" && (
				<div className="mt-4 p-2 bg-slate-900 rounded text-sm">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<h4 className="font-bold mb-1 text-green-400">Completed IDs</h4>
							<div className="flex flex-wrap gap-1">
								{challenge.challenge.completedIds.map(id => get_id_name(id)).filter(x => typeof x === "string").sort((a, b) => a.localeCompare(b)).map(id => (
									<span key={id} className="bg-green-900 text-green-200 px-1 rounded text-xs">{id}</span>
								))}
							</div>
						</div>
						<div>
							<h4 className="font-bold mb-1 text-yellow-400">Available IDs</h4>
							<div className="flex flex-wrap gap-1">
								{challenge.challenge.availableIds.map(id => get_id_name(id)).filter(x => typeof x === "string").sort((a, b) => a.localeCompare(b)).map(id => (
									<span key={id} className="bg-yellow-900 text-yellow-200 px-1 rounded text-xs">{id}</span>
								))}
							</div>
						</div>
					</div>
				</div>
			)}
			{expanded && challenge_notes[challenge.challenge.id] && (
				<div className="mt-4 p-2 bg-slate-900 rounded text-sm">
					<ul className="list-disc list-inside">
						{challenge_notes[challenge.challenge.id].map((note, i) => (
							<li key={i} className={`text-${note.type === "bug" ? "red" : note.type === "info" ? "yellow" : "green"}-400`}>{note.text}</li>
						))}
					</ul>
				</div>
			)}
		</Card>
	);
}

export default function User() {
	const { static_data } = useStaticData();
	const [search, set_search] = useState("");
	const [sort_by, set_sort_by] = useState<"name" | "progress">("progress");
	const [sort_order, set_sort_order] = useState<SortDirection>("desc");
	const [hide_masters, set_hide_masters] = useState(true);
	const [hide_legacy, set_hide_legacy] = useState(true);
	const [hide_capstone, set_hide_capstone] = useState(true);

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
			if (sort_by === "progress") {
				if (a.progress >= 100 && b.progress >= 100) {
					if (a.challenge.currentLevel != b.challenge.currentLevel) {
						return levels.indexOf(a.challenge.currentLevel) - levels.indexOf(b.challenge.currentLevel) * (sort_order === "asc" ? 1 : -1);
					} else {
						return a.progress - b.progress * (sort_order === "asc" ? -1 : 1);
					}
				}
				return (b.progress - a.progress) * (sort_order === "asc" ? -1 : 1);
			}
		});

		if (hide_masters) {
			props_challenges = props_challenges.filter(c => c.challenge.pointsAwarded < 100 && c.challenge.currentValue < c.next_threshold);
		}

		return props_challenges;
	}, [static_data.lcu_data, hide_masters, hide_legacy, search, sort_by, sort_order]);

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
						set_sort_by(field as "name" | "progress");
					}}
					value={sort_by}
				>
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

			<div className="grid grid-cols-1 gap-2">
				{filtered_challenges.map(challenge => {
					return (<TempChallengeCard key={challenge.challenge.id} challenge={challenge} />);
				})}
			</div>
		</div>
	);
}
