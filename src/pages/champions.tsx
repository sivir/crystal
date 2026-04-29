import { useEffect, useMemo, useState } from "react";
import { default_mastery_data, useStaticData } from "@/data_context.tsx";
import { challenge_icon, SortDirection, classes, mastery_color, get_champion_region, regions } from "@/lib/utils.ts";
import { ChampionMasteryIcon } from "@/components/champion_mastery_icon";
import { usePersistedState } from "@/hooks/use-persisted-state";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, Check, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FilterDropdown } from "@/components/filter_dropdown.tsx";
import { Progress } from "@/components/ui/progress";

import {
	CATCH_EM_ALL_CHALLENGE_ID,
	TRACKED_CHAMPION_CHALLENGES as default_tracked_challenges,
} from "@/lib/challenges";

type ChampionTableRow = {
	name: string;
	id: number;
	roles: string[];
	region: string;
	mastery_level: number;
	mastery_points: number;
	points_since_last_level: number;
	points_until_next_level: number;
	checks: boolean[];
}

export default function Champions() {
	const { static_data, has_lcu_data } = useStaticData();
	const [champion_table_data, set_champion_table_data] = useState<ChampionTableRow[]>([]);
	const [search, set_search] = useState<string>('');

	// persisted state
	const [selected_roles, set_selected_roles] = usePersistedState<string[]>('champions.selected_roles', []);
	const [sort_field, set_sort_field] = usePersistedState<keyof ChampionTableRow>('champions.sort_field', 'mastery_level');
	const [sort_direction, set_sort_direction] = usePersistedState<SortDirection>('champions.sort_direction', 'desc');
	const [selected_challenges, set_selected_challenges] = usePersistedState<number[]>('champions.selected_challenges', default_tracked_challenges);
	const [challenge_filters, set_challenge_filters] = usePersistedState<Record<number, 'incomplete' | 'complete' | null>>('champions.challenge_filters', {});
	const [selected_regions, set_selected_regions] = usePersistedState<string[]>('champions.selected_regions', []);

	useEffect(() => {
		set_champion_table_data(Object.entries(static_data.champion_map).map(([id, champion]) => {
			const current_mastery_data = static_data.mastery_data.find(x => x.championId === parseInt(id)) || default_mastery_data;
			return {
				name: champion.name,
				id: parseInt(id),
				roles: champion.roles,
				region: get_champion_region(parseInt(id), static_data.lcu_data) || "None",
				mastery_level: current_mastery_data.championLevel,
				mastery_points: current_mastery_data.championPoints,
				points_since_last_level: current_mastery_data.championPointsSinceLastLevel,
				points_until_next_level: current_mastery_data.championPointsUntilNextLevel,
				checks: default_tracked_challenges.map(x => static_data.lcu_data[x]?.completedIds?.includes(parseInt(id)) ?? false)
			};
		}));
	}, [static_data.champion_map, static_data.mastery_data, static_data.lcu_data]);

	const sorted_table_data = useMemo(() => {
		return [...champion_table_data].sort((a, b) => {
			const a_value = a[sort_field];
			const b_value = b[sort_field];

			if (a_value !== b_value) {
				if (sort_direction === 'asc') {
					return a_value > b_value ? 1 : -1;
				} else {
					return a_value < b_value ? 1 : -1;
				}
			}

			const secondary_field = sort_field === "mastery_level" ? "mastery_points" : "mastery_level";
			const a_secondary_value = a[secondary_field];
			const b_secondary_value = b[secondary_field];

			if (sort_direction === 'asc') {
				return a_secondary_value > b_secondary_value ? 1 : -1;
			} else {
				return a_secondary_value < b_secondary_value ? 1 : -1;
			}
		});
	}, [champion_table_data, sort_field, sort_direction]);

	const filtered_table_data = useMemo(() => {
		return sorted_table_data.filter(item => {
			const roleMatch = selected_roles.length === 0 || item.roles.some(role => selected_roles.map(x => x.toLowerCase()).includes(role));
			const nameMatch = search === '' || item.name.toLowerCase().includes(search.toLowerCase());
			const regionMatch = selected_regions.length === 0 || (item.region && selected_regions.includes(item.region));

			const challengeMatch = selected_challenges.every(challenge_id => {
				const filter = challenge_filters[challenge_id];
				if (!filter) return true;

				const index = default_tracked_challenges.indexOf(challenge_id);
				if (index === -1) return true; // Should ideally not happen if data is consistent

				const is_completed = item.checks[index];
				if (filter === 'incomplete') return !is_completed;
				if (filter === 'complete') return is_completed;
				return true;
			});

			return roleMatch && nameMatch && regionMatch && challengeMatch;
		});
	}, [sorted_table_data, selected_roles, selected_regions, search, challenge_filters, selected_challenges]);

	const catch_em_all = useMemo(() => {
		if (!has_lcu_data) {
			return -1;
		}
		return static_data.lcu_data[CATCH_EM_ALL_CHALLENGE_ID]?.currentValue ?? -1;
	}, [has_lcu_data, static_data.lcu_data]);

	const toggle_challenge_filter = (id: number) => {
		set_challenge_filters(prev => {
			const current = prev[id];
			let next: 'incomplete' | 'complete' | null = null;
			if (!current) next = 'incomplete';
			else if (current === 'incomplete') next = 'complete';
			else next = null;
			return { ...prev, [id]: next };
		});
	};

	return (
		<>
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between flex-col sm:flex-row gap-4">
				<div className="flex items-center gap-2 flex-wrap">
					<div className="relative">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search Champions..."
							className="pl-8 w-[200px]"
							value={search}
							onChange={(e) => set_search(e.target.value)}
						/>
					</div>

					<FilterDropdown
						title="Roles"
						items={classes}
						selected_items={selected_roles}
						set_selected_items={set_selected_roles}
						item_to_label={(item: string) => item}
					/>

					<FilterDropdown
						title="Regions"
						items={regions}
						selected_items={selected_regions}
						set_selected_items={set_selected_regions}
						item_to_label={(item: string) => item}
					/>

					<div className="flex items-center gap-1">
						<Select
							onValueChange={(field) => {
								set_sort_field(field as keyof ChampionTableRow);
							}}
							value={sort_field}
						>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="Sort by" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="mastery_level">Mastery Level</SelectItem>
								<SelectItem value="mastery_points">Mastery Points</SelectItem>
								<SelectItem value="name">Name</SelectItem>
							</SelectContent>
						</Select>

						<Button
							variant="outline"
							size="icon"
							onClick={() => {
								set_sort_direction(prev => prev === 'asc' ? 'desc' : 'asc');
							}}
							title={`Sort ${sort_direction === 'asc' ? 'Ascending' : 'Descending'}`}
						>
							{sort_direction === 'asc' ? (
								<ArrowUp className="h-4 w-4" />
							) : (
								<ArrowDown className="h-4 w-4" />
							)}
						</Button>
					</div>

					<FilterDropdown
						title="Challenges"
						items={default_tracked_challenges}
						selected_items={selected_challenges}
						set_selected_items={set_selected_challenges}
						item_to_label={(item: number) => static_data.lcu_data[item]?.name ?? `Challenge ${item}`}
					/>
				</div>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader className="sticky top-0 bg-background z-10">
						<TableRow>
							<TableHead>Champion</TableHead>
							<TableHead></TableHead>
							<TableHead>Mastery</TableHead>
							<TableHead>Region</TableHead>
							{selected_challenges.map(x => <TableHead key={x} className="w-[40px] min-w-[40px]">
								<Tooltip>
									<TooltipTrigger asChild>
										<div 
											className={`relative cursor-pointer w-fit rounded-full transition-all ${
												challenge_filters[x] === 'incomplete' ? 'ring-2 ring-red-500' : 
												challenge_filters[x] === 'complete' ? 'ring-2 ring-green-500' : ''
											}`}
											onClick={() => toggle_challenge_filter(x)}
										>
											<img src={challenge_icon(static_data.lcu_data[x])} alt="icon" className="w-6 h-6" />
											{challenge_filters[x] === 'incomplete' && <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-[1px]"><X className="w-3 h-3 text-white" /></div>}
											{challenge_filters[x] === 'complete' && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-[1px]"><Check className="w-3 h-3 text-white" /></div>}
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<p>{static_data.lcu_data[x]?.description ?? `Challenge ${x}`} ({static_data.lcu_data[x]?.completedIds?.length ?? 0} / {Object.keys(static_data.champion_map).length})</p>
									</TooltipContent>
								</Tooltip>
							</TableHead>)}
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered_table_data.map((item, i) => {
							const mastery_data = static_data.mastery_data.find(m => m.championId === item.id) || { ...default_mastery_data, championId: item.id };
							return (
								<TableRow key={i} className={catch_em_all > 0 && item.mastery_points >= catch_em_all ? "bg-amber-50 dark:bg-amber-950/30" : ""}>
									<TableCell className="flex items-center gap-2">
										<ChampionMasteryIcon data={mastery_data} className="w-8 h-8" />
										{item.name}
									</TableCell>
									<TableCell>
										{item.roles.map((role, j) => (
											<Badge variant="outline" key={j}>{role}</Badge>
										))}
									</TableCell>
									<TableCell>
									<div className="flex items-center gap-2">
										<Badge className={mastery_color(item.mastery_level)}>{item.mastery_level}</Badge>
										<div className="flex flex-col">
											<span className="text-sm leading-tight">{item.mastery_points.toLocaleString()}</span>
											<Progress
												value={item.points_until_next_level === 0 ? 100 : (item.points_since_last_level / (item.points_since_last_level + item.points_until_next_level)) * 100}
												className="h-1 w-16 bg-muted"
											/>
										</div>
									</div>
								</TableCell>
									<TableCell>
										{item.region}
									</TableCell>
									{selected_challenges.map((challenge, j) => {
										const index = default_tracked_challenges.indexOf(challenge);
										return (
											<TableCell key={j} className="w-[40px] min-w-[40px]">{item.checks[index] ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</TableCell>
										);
									})}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
		</>
	);
}
