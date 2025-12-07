import { APILCUChallenge, useStaticData, default_mastery_data } from "@/data_context";
import { useState, useMemo } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { challenge_icon, classes } from "@/lib/utils";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { ChampionMasteryIcon } from "@/components/champion_mastery_icon";

const VARIETYS_OVERRATED_ID = 303408;

export default function TeamBuilder() {
	const { static_data } = useStaticData();
	const [selected_challenges, set_selected_challenges] = useState<number[]>([]);
	const [selected_role, set_selected_role] = useState<string>("Mage");
	const [sort_method, set_sort_method] = useState<"name" | "mastery">("mastery");

	const harmony_challenges = useMemo(() => Object.values(static_data.lcu_data).filter((c) => c.capstoneGroupName === "Harmony" && !c.isCapstone), [static_data.lcu_data]);
	const globetrotter_challenges = useMemo(() => Object.values(static_data.lcu_data).filter((c) => c.capstoneGroupName === "Globetrotter" && !c.isCapstone), [static_data.lcu_data]);

	const toggle_challenge = (id: number) => {
		set_selected_challenges((prev) =>
			prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
		);
	};

	const filtered_champions = useMemo(() => {
		const all_champions = Object.values(static_data.champion_map);

		if (selected_challenges.length === 0) {
			return all_champions.map(c => ({ ...c, is_filtered: false }));
		}

		const selected_challenge_objects = selected_challenges.map(id => Object.values(static_data.lcu_data).find(c => c.id === id)).filter(x => x);

		return all_champions.map(champion => {
			const is_available = selected_challenge_objects.every(challenge => {
				if (!challenge) return true;

				if (challenge.id === VARIETYS_OVERRATED_ID) {
					return champion.roles.includes(selected_role.toLowerCase());
				}

				return challenge.availableIds.includes(champion.id);
			});

			return { ...champion, is_filtered: !is_available };
		});
	}, [static_data.champion_map, harmony_challenges, globetrotter_challenges, selected_challenges, selected_role]);

	const sorted_champions = useMemo(() => {
		return [...filtered_champions].sort((a, b) => {
			if (a.is_filtered !== b.is_filtered) {
				return a.is_filtered ? 1 : -1;
			}

			if (sort_method === "mastery") {
				const a_mastery = static_data.mastery_data.find(m => m.championId === a.id) || default_mastery_data;
				const b_mastery = static_data.mastery_data.find(m => m.championId === b.id) || default_mastery_data;

				if (a_mastery.championLevel !== b_mastery.championLevel) {
					return b_mastery.championLevel - a_mastery.championLevel;
				}

				if (a_mastery.championPoints !== b_mastery.championPoints) {
					return b_mastery.championPoints - a_mastery.championPoints;
				}
			}

			return a.name.localeCompare(b.name);
		});
	}, [filtered_champions, sort_method, static_data.mastery_data]);

	const champion_list = useMemo(() => {
		return sorted_champions.filter((champion) => !champion.is_filtered).map((champion) => champion.name).join(", ");
	}, [sorted_champions]);

	const render_challenge_item = (challenge: APILCUChallenge) => {
		const is_selected = selected_challenges.includes(challenge.id);
		const master_threshold = challenge.thresholds?.["MASTER"]?.value || 1;
		const progress_text = `${challenge.currentValue}/${master_threshold}`;

		return (
			<div key={challenge.id} className="flex flex-col space-y-2">
				<div className="flex items-start space-x-2">
					<Checkbox
						id={`challenge-${challenge.id}`}
						checked={is_selected}
						onCheckedChange={() => toggle_challenge(challenge.id)}
					/>
					<div className="flex-1 space-y-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex justify-between items-center cursor-pointer">
									<Label
										htmlFor={`challenge-${challenge.id}`}
										className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
									>
										{challenge.name}
									</Label>
									<div className="flex items-center gap-1">
										<img src={challenge_icon(static_data.lcu_data[challenge.id])} alt={challenge.name} className="w-4 h-4" />
										<span className="text-xs text-muted-foreground">({progress_text})</span>
									</div>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p className="max-w-xs">{challenge.description}</p>
							</TooltipContent>
						</Tooltip>

						{challenge.id === VARIETYS_OVERRATED_ID && is_selected && (
							<div className="pt-1">
								<Select value={selected_role} onValueChange={set_selected_role}>
									<SelectTrigger className="h-8 w-full">
										<SelectValue placeholder="Select Role" />
									</SelectTrigger>
									<SelectContent>
										{classes.map((role) => (
											<SelectItem key={role} value={role}>
												{role}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="flex h-[calc(100vh-5rem)] overflow-hidden">
			<div className="flex-1 p-6 overflow-y-auto">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-3xl font-bold">Team Builder</h1>
					<Select value={sort_method} onValueChange={(v) => set_sort_method(v as "name" | "mastery")}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="name">Name</SelectItem>
							<SelectItem value="mastery">Mastery</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
					{sorted_champions.map((champion) => {
						const mastery_data = static_data.mastery_data.find(m => m.championId === champion.id) || { ...default_mastery_data, championId: champion.id };
						return (
							<div key={champion.id} className={`${champion.is_filtered ? "opacity-30 grayscale" : "opacity-100"}`} title={champion.name}>
								<ChampionMasteryIcon data={mastery_data} className="w-12 h-12" />
							</div>
						);
					})}
				</div>
			</div>

			<div className="w-[40rem] border-l bg-muted/10 p-6 overflow-y-auto flex flex-col gap-4">
				<h2 className="text-xl font-semibold">Filters</h2>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<h3 className="font-medium mb-3 text-primary border-b pb-1">Harmony</h3>
						<div className="space-y-2">
							{harmony_challenges.map(render_challenge_item)}
						</div>
					</div>

					<div>
						<h3 className="font-medium mb-3 text-primary border-b pb-1">Globetrotter</h3>
						<div className="space-y-2">
							{globetrotter_challenges.map(render_challenge_item)}
						</div>
					</div>
				</div>
				<Textarea value={champion_list} readOnly className="flex-1" />
				<Button onClick={() => writeText(champion_list)}><Copy className="h-4 w-4" />Copy to Clipboard</Button>
			</div>
		</div>
	);
}
