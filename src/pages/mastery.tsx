import { useEffect, useMemo, useState } from "react";
import { useStaticData } from "@/data_context";
import { challenge_icon, challenge_level_icon, classes, get_champion_region, get_level_color, get_progress_color, is_classic_champion, is_mastery_champion, is_standard_champion, levels, regions, to_standard_champion_id, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, ResponsiveContainer, Text, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ChampionMasteryIcon } from "@/components/champion_mastery_icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOptimalPath } from "@/hooks/use-optimal-path";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { default_mastery_data } from "@/data_context";

import {
	M7_CHALLENGES as m7_challenges,
	M10_CHALLENGES as m10_challenges,
	MASTERY_HEADLINE_CHALLENGES,
	CATCH_EM_ALL_CHALLENGE_ID,
} from "@/lib/challenges";

const MASTERY_PER_LEVEL = [0, 1800, 4200, 6600, 9000, 10000, 11000, 11000, 11000];
const M5_POINTS = MASTERY_PER_LEVEL.slice(0, 5).reduce((sum, pts) => sum + pts, 0);
const M7_POINTS = MASTERY_PER_LEVEL.slice(0, 7).reduce((sum, pts) => sum + pts, 0);
const M10_POINTS = MASTERY_PER_LEVEL.slice(0, 10).reduce((sum, pts) => sum + pts, 0);
const DEFAULT_CATCH_EM_ALL_THRESHOLDS: { level: string; value: number }[] = [
	{ level: "IRON", value: 100 },
	{ level: "BRONZE", value: 500 },
	{ level: "SILVER", value: 1000 },
	{ level: "GOLD", value: 5000 },
	{ level: "PLATINUM", value: 10000 },
	{ level: "DIAMOND", value: 50000 },
	{ level: "MASTER", value: 100000 },
	{ level: "GRANDMASTER", value: 107500 },
	{ level: "CHALLENGER", value: 115000 },
];

type GoalTick = {
	points: number;
	kind: "catch" | "mastery";
	level?: string;
	label: string;
	icon?: string;
};

function format_goal_points(points: number) {
	if (points === M5_POINTS) return "M5";
	if (points === M7_POINTS) return "M7";
	if (points === M10_POINTS) return "M10";
	if (points >= 1000) {
		return points % 1000 === 0
			? `${(points / 1000).toLocaleString()}k`
			: `${(points / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;
	}
	return points.toLocaleString();
}

type GoalMode = "max" | "next" | "custom";
type MasteryFilter = "none" | "m5" | "m7" | "m10" | "custom" | "goal";
type ChampionTypeFilter = "all" | "classic" | "non_classic";

export default function Mastery() {
	const { static_data, has_lcu_data } = useStaticData();
	const { class_data, optimal_path, m7_path_ids, m10_path_ids } = useOptimalPath();
	const [selected_class, set_selected_class] = usePersistedState("mastery.selected_class", "all");
	const [selected_region, set_selected_region] = usePersistedState("mastery.selected_region", "all");
	const [mastery_filter, set_mastery_filter] = usePersistedState<MasteryFilter>("mastery.mastery_filter", "none");
	const [custom_mastery_points, set_custom_mastery_points] = usePersistedState("mastery.custom_mastery_points", "100000");
	const [search, set_search] = usePersistedState("mastery.search", "");
	const [goal_mode, set_goal_mode] = usePersistedState<GoalMode>("mastery.goal_mode", "max");
	const [show_m7_path, set_show_m7_path] = usePersistedState("mastery.show_m7_path", false);
	const [show_m10_path, set_show_m10_path] = usePersistedState("mastery.show_m10_path", false);
	const [champion_type, set_champion_type] = usePersistedState<ChampionTypeFilter>("mastery.champion_type", "all");
	const [custom_goal_points, set_custom_goal_points] = usePersistedState("mastery.custom_goal_points", 100000);
	const [custom_goal_input, set_custom_goal_input] = useState("100000");

	useEffect(() => {
		set_custom_goal_input(String(custom_goal_points));
	}, [custom_goal_points]);

	const goal_ticks = useMemo<GoalTick[]>(() => {
		const catch_em_all = has_lcu_data ? static_data.lcu_data[CATCH_EM_ALL_CHALLENGE_ID] : null;
		const catch_ranks = (catch_em_all
			? levels
				.filter(level => catch_em_all.thresholds[level]?.value != null && catch_em_all.thresholds[level].value > 0)
				.map(level => ({ level, value: catch_em_all.thresholds[level].value }))
			: DEFAULT_CATCH_EM_ALL_THRESHOLDS
		).map(({ level, value }): GoalTick => ({
			points: value,
			kind: "catch",
			level,
			label: level.charAt(0) + level.slice(1).toLowerCase(),
			icon: challenge_level_icon(catch_em_all, level, CATCH_EM_ALL_CHALLENGE_ID),
		}));

		const mastery_ticks: GoalTick[] = [
			{ points: M5_POINTS, kind: "mastery", label: "M5" },
			{ points: M7_POINTS, kind: "mastery", label: "M7" },
			{ points: M10_POINTS, kind: "mastery", label: "M10" },
		];

		return [...catch_ranks, ...mastery_ticks].sort((a, b) => a.points - b.points || a.label.localeCompare(b.label));
	}, [static_data.lcu_data, has_lcu_data]);

	const selected_goal_tick = useMemo(
		() => goal_ticks.find(tick => tick.points === custom_goal_points),
		[goal_ticks, custom_goal_points],
	);

	const slider_goal_index = useMemo(() => {
		if (goal_ticks.length === 0) return 0;
		const exact = goal_ticks.findIndex(tick => tick.points === custom_goal_points);
		if (exact >= 0) return exact;
		let best = 0;
		let best_dist = Math.abs(goal_ticks[0].points - custom_goal_points);
		for (let i = 1; i < goal_ticks.length; i++) {
			const dist = Math.abs(goal_ticks[i].points - custom_goal_points);
			if (dist < best_dist) {
				best = i;
				best_dist = dist;
			}
		}
		return best;
	}, [goal_ticks, custom_goal_points]);

	const set_goal_from_tick = (index: number) => {
		const tick = goal_ticks[index];
		if (!tick) return;
		set_custom_goal_points(tick.points);
		set_custom_goal_input(String(tick.points));
	};

	const set_goal_from_input = (raw: string) => {
		set_custom_goal_input(raw);
		const parsed = Number(raw.replace(/,/g, ""));
		if (Number.isFinite(parsed) && parsed > 0) {
			set_custom_goal_points(Math.floor(parsed));
		}
	};

	const class_champion_ids = useMemo(() => {
		const map = new Map<string, number[]>();
		for (const cls of classes) map.set(cls, []);
		if (class_data.length > 0) {
			for (const data of class_data) {
				map.set(data.class_name, data.champions.map(c => c.id));
			}
			return map;
		}
		for (const [id_str, champ] of Object.entries(static_data.champion_map)) {
			const id = parseInt(id_str);
			if (!is_mastery_champion(id)) continue;
			for (const role of champ.roles ?? []) {
				const normalized = role.charAt(0).toUpperCase() + role.slice(1);
				if (map.has(normalized)) map.get(normalized)!.push(id);
			}
		}
		return map;
	}, [static_data.champion_map, class_data]);

	const all_champions = useMemo(() => {
		const mastery_by_champion = new Map(static_data.mastery_data.map(m => [m.championId, m]));
		const ids = new Set<number>();
		for (const id_str of Object.keys(static_data.champion_map)) {
			const id = parseInt(id_str);
			if (is_mastery_champion(id)) ids.add(id);
		}
		for (const mastery of static_data.mastery_data) {
			if (is_mastery_champion(mastery.championId)) ids.add(mastery.championId);
		}

		const champ_to_classes = new Map<number, string[]>();
		for (const [cls, ids_in_class] of class_champion_ids) {
			for (const id of ids_in_class) {
				const existing = champ_to_classes.get(id) ?? [];
				existing.push(cls);
				champ_to_classes.set(id, existing);
			}
		}

		return [...ids]
			.map(id => {
				const champ = static_data.champion_map[id];
				const mastery = mastery_by_champion.get(id) || { ...default_mastery_data, championId: id };
				const region_id = to_standard_champion_id(id) ?? id;
				return {
					id,
					name: champ?.name || (is_classic_champion(id) ? `Champion ${id} (Classic)` : `Champion ${id}`),
					roles: champ_to_classes.get(id) ?? (champ?.roles ?? []).map(r => r.charAt(0).toUpperCase() + r.slice(1)),
					region: has_lcu_data ? get_champion_region(region_id, static_data.lcu_data) : null,
					mastery_level: mastery.championLevel,
					mastery_points: mastery.championPoints,
					points_until_next: mastery.championPointsUntilNextLevel,
					mastery,
					is_classic: is_classic_champion(id),
				};
			})
			.sort((a, b) => b.mastery_points - a.mastery_points || b.mastery_level - a.mastery_level || a.name.localeCompare(b.name));
	}, [static_data.champion_map, static_data.mastery_data, static_data.lcu_data, class_champion_ids, has_lcu_data]);

	const champion_targets = useMemo(() => {
		const targets = new Map<number, { progress: number; label: string }>();
		const set_next = (champ: typeof all_champions[number]) => {
			const pts = champ.mastery_points;
			const remaining = champ.points_until_next;
			if (remaining == null || remaining <= 0) {
				// Unplayed champs default to 0 until-next; otherwise show current level (not MAX)
				if (pts === 0) {
					targets.set(champ.id, { progress: 0, label: "0/0" });
				} else {
					targets.set(champ.id, { progress: 1, label: `M${champ.mastery_level}` });
				}
			} else {
				const target = pts + remaining;
				targets.set(champ.id, { progress: Math.min(pts / target, 1), label: `M${champ.mastery_level + 1}` });
			}
		};

		if (goal_mode === "next") {
			for (const champ of all_champions) set_next(champ);
			return targets;
		}
		if (goal_mode === "custom") {
			for (const champ of all_champions) {
				targets.set(champ.id, {
					progress: Math.min(champ.mastery_points / custom_goal_points, 1),
					label: format_goal_points(custom_goal_points),
				});
			}
			return targets;
		}

		// Max goal: top champ → 840k, next 149 → 100k; everyone else falls back to next-level bar
		for (const champ of all_champions) set_next(champ);
		if (!optimal_path) return targets;
		const path_ids = m10_path_ids;
		const m10_threshold = 75600;
		const standard = all_champions.filter(c => is_standard_champion(c.id));
		const effective_sorted = [...standard].sort((a, b) => {
			const ea = path_ids.has(a.id) ? Math.max(a.mastery_points, m10_threshold) : a.mastery_points;
			const eb = path_ids.has(b.id) ? Math.max(b.mastery_points, m10_threshold) : b.mastery_points;
			return eb - ea;
		});
		effective_sorted.forEach((champ, i) => {
			if (i === 0) {
				targets.set(champ.id, { progress: Math.min(champ.mastery_points / 840000, 1), label: "840k" });
			} else if (i < 150) {
				targets.set(champ.id, { progress: Math.min(champ.mastery_points / 100000, 1), label: "100k" });
			}
		});
		return targets;
	}, [all_champions, goal_mode, custom_goal_points, optimal_path, m10_path_ids]);

	const filtered_champions = useMemo(() => {
		const class_ids = selected_class === "all" ? null : class_champion_ids.get(selected_class);
		const custom_pts = Number(custom_mastery_points) || 0;
		const search_lower = search.trim().toLowerCase();
		const path_filter_active = show_m7_path || show_m10_path;

		return all_champions.filter(champ => {
			if (champion_type === "classic" && !champ.is_classic) return false;
			if (champion_type === "non_classic" && champ.is_classic) return false;
			if (selected_class !== "all") {
				if (class_ids && !class_ids.includes(champ.id)) return false;
			}
			if (selected_region !== "all" && champ.region !== selected_region) return false;
			if (mastery_filter === "m5" && champ.mastery_level >= 5) return false;
			if (mastery_filter === "m7" && champ.mastery_level >= 7) return false;
			if (mastery_filter === "m10" && champ.mastery_level >= 10) return false;
			if (mastery_filter === "custom" && champ.mastery_points >= custom_pts) return false;
			if (mastery_filter === "goal") {
				const ct = champion_targets.get(champ.id);
				if (ct && ct.progress >= 1) return false;
			}
			if (search_lower && !champ.name.toLowerCase().includes(search_lower)) return false;
			if (path_filter_active) {
				const on_m7 = show_m7_path && m7_path_ids.has(champ.id);
				const on_m10 = show_m10_path && m10_path_ids.has(champ.id);
				if (!on_m7 && !on_m10) return false;
			}
			return true;
		});
	}, [all_champions, champion_type, selected_class, selected_region, class_champion_ids, mastery_filter, custom_mastery_points, champion_targets, search, show_m7_path, show_m10_path, m7_path_ids, m10_path_ids]);

	const all_progress_items = useMemo(() => {
		return class_data.flatMap(data => [
			{
				id: `${data.class_name}-M7`,
				class_name: data.class_name,
				type: 'M7' as const,
				info: data.m7_info,
				progress: data.m7_progress,
				champions: data.champions
			},
			{
				id: `${data.class_name}-M10`,
				class_name: data.class_name,
				type: 'M10' as const,
				info: data.m10_info,
				progress: data.m10_progress,
				champions: data.champions
			}
		]).sort((a, b) => {
			const a_val = a.progress.possible ? a.progress.total : Infinity;
			const b_val = b.progress.possible ? b.progress.total : Infinity;
			return a_val - b_val;
		});
	}, [class_data]);

	const m10_or_above_count = static_data.mastery_data.filter(mastery => is_standard_champion(mastery.championId) && mastery.championLevel >= 10).length;
	const path_champion_count = m10_path_ids.size + m10_or_above_count;

	return (
		<div className="p-6 space-y-6">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">Mastery Class Challenges</CardTitle>
					</CardHeader>
					<CardContent className="pb-0">
						<ChartContainer config={{
							diff: { label: "Mastery 7", color: "#2563eb" },
							m10: { label: "Mastery 10", color: "#60a5fa" }
						}} className="min-h-[100px]">
							<div className="flex flex-wrap">
								{classes.map((class_name, index) => {
									if (!has_lcu_data) return null;

									const m7_challenge = static_data.lcu_data[m7_challenges[index]];
									const m10_challenge = static_data.lcu_data[m10_challenges[index]];
									if (!m7_challenge || !m10_challenge) return null;

									const m7_thresholds = Object.entries(m7_challenge.thresholds).sort(([, a]: any, [_, b]: any) => a.value - b.value).map((value: any) => value[1].value);
									const m10_thresholds = Object.entries(m10_challenge.thresholds).sort(([, a]: any, [_, b]: any) => a.value - b.value).map((value: any) => value[1].value);
									const m7_current = m7_challenge.currentValue;
									const m10_current = m10_challenge.currentValue;
									const m7_max = m7_challenge.thresholds["MASTER"]?.value ?? m7_thresholds[m7_thresholds.length - 1];

									const chart_data = [{
										name: class_name,
										m7: m7_current,
										diff: m7_current - m10_current,
										m10: m10_current
									}];

									return (
										<div className="flex-1 min-w-[70px]" key={class_name}>
											<ResponsiveContainer width="100%" height={250}>
												<BarChart data={chart_data}>
													<ChartTooltip
														wrapperStyle={{ zIndex: 100, minWidth: '150px' }}
														content={
															<ChartTooltipContent
																formatter={(_value, name, _item) => {
																	const current_value = name === "diff" ? m7_current : m10_current;
																	const next_threshold = name === "diff"
																		? (m7_thresholds.find((t: any) => t > m7_current) || m7_max)
																		: (m10_thresholds.find((t: any) => t > m10_current) || m7_max);
																	return <div className="flex items-center justify-between gap-4 whitespace-nowrap">
																		<div className="flex items-center gap-2">
																			<div
																				className="h-2.5 w-1 shrink-0 rounded-[2px]"
																				style={{ backgroundColor: name === "diff" ? "#2563eb" : "#60a5fa" }}
																			/>
																			<span className="text-muted-foreground">
																				{name === "diff" ? "Mastery 7" : "Mastery 10"}
																			</span>
																		</div>
																		<span className="font-mono font-medium tabular-nums text-foreground">
																			{current_value} / {next_threshold}
																		</span>
																	</div>;
																}}
															/>
														}
													/>
													<XAxis dataKey="name" interval={0} />
													<YAxis
														width={20}
														ticks={m7_thresholds.filter((value: any) => value >= m10_current)}
														domain={[0, m7_max]}
														interval={0}
														tick={(props: any) => {
															const { payload } = props;
															const colors: Record<number, string> = {
																[m7_thresholds[0]]: "#51484a",
																[m7_thresholds[1]]: "#8c513a",
																[m7_thresholds[2]]: "#80989d",
																[m7_thresholds[3]]: "#cd8837",
																[m7_thresholds[4]]: "#4e9996",
																[m7_thresholds[5]]: "#576bce",
																[m7_thresholds[6]]: "#9d48e0"
															};
															props.stroke = colors[payload.value] || "#888888";
															return <Text {...props}>{payload.value}</Text>;
														}}
													/>
													<Bar dataKey="m10" stackId="a" fill="var(--color-m10)" />
													<Bar dataKey="diff" stackId="a" fill="var(--color-diff)" />
												</BarChart>
											</ResponsiveContainer>
										</div>
									);
								})}
							</div>
						</ChartContainer>

							{optimal_path && (
								<div className="mb-2 rounded-md border bg-muted/30 p-2">
									<div className="flex items-center justify-between gap-3">
										<span className="text-xs font-semibold">Path + M10 Champions</span>
										<span className="text-lg font-semibold leading-none text-purple-500">{path_champion_count}</span>
									</div>
									<div className="mt-0.5 text-[10px] text-muted-foreground">
										{m10_path_ids.size} on path + {m10_or_above_count} already M10+
									</div>
								</div>
							)}
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6">
						<div className="grid grid-cols-2 gap-3">
							{MASTERY_HEADLINE_CHALLENGES.map(challengeId => {
								if (!has_lcu_data) return null;
								const challenge = static_data.lcu_data[challengeId];
								if (!challenge) return null;

								const next_level_index = levels.indexOf(challenge.currentLevel) + 1;
								const next_level = next_level_index < levels.length ? levels[next_level_index] : "CHALLENGER";
								const next_threshold = challenge.thresholds[next_level]?.value || challenge.thresholds["MASTER"]?.value || challenge.thresholds[challenge.currentLevel]?.value || challenge.currentValue;
								const progress = Math.min((challenge.currentValue / next_threshold) * 100, 100);

								return (
									<Tooltip key={challengeId}>
										<TooltipTrigger asChild>
											<div className="space-y-1 cursor-help">
												<div className="flex items-center gap-2">
													<img
														src={challenge_icon(challenge)}
														alt={challenge.name}
														className="w-8 h-8 rounded-full shrink-0"
													/>
													<div className="flex-1 min-w-0">
														<div className="flex justify-between text-sm">
															<span className={`truncate ${get_level_color(challenge.currentLevel)}`}>{challenge.name}</span>
														</div>
														<div className="flex justify-between text-xs text-muted-foreground">
															<span>{challenge.currentValue.toLocaleString()} / {next_threshold.toLocaleString()}</span>
														</div>
													</div>
												</div>
												<Progress
													value={progress}
													className="h-1.5 bg-muted"
													indicatorClassName={get_progress_color(challenge.currentLevel)}
												/>
											</div>
										</TooltipTrigger>
										<TooltipContent>
											<p>{challenge.description}</p>
										</TooltipContent>
									</Tooltip>
								);
							})}
						</div>

						{all_progress_items.length > 0 && (() => {
							const closest_item = all_progress_items[0];
							return (
								<>
									<Separator className="my-4" />
									<Dialog>
										<DialogTrigger asChild>
											<div className="cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-md transition-colors text-left group">
												<div className="mb-2 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
													Closest Challenge
												</div>
												<div className="p-4 border rounded-lg space-y-3 bg-card shadow-sm">
													<div className="flex justify-between items-center border-b pb-2">
														<div className="flex items-center gap-2">
															<span className="font-semibold text-base">{closest_item.class_name} Class</span>
															<Badge variant="secondary" className={closest_item.type === 'M7' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' : 'bg-blue-400/10 text-blue-400 hover:bg-blue-400/20'}>
																{closest_item.type}
															</Badge>
														</div>
														<div className="flex items-center gap-3 text-sm">
															<span className="text-muted-foreground text-xs">
																{closest_item.progress.possible ? `${closest_item.progress.total.toLocaleString()} pts needed` : `Need ${closest_item.progress.champions_needed - closest_item.progress.available} more`}
															</span>
															<span className="font-medium">{closest_item.info.current} / {closest_item.info.next_threshold}</span>
														</div>
													</div>
													{closest_item.progress.possible && (
														<div className="grid grid-cols-2 gap-2">
															{closest_item.champions.filter(c => closest_item.progress.selected_ids?.includes(c.id)).map(champ => (
																<div key={champ.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border">
																	<ChampionMasteryIcon data={champ.mastery} className="w-8 h-8" />
																	<div className="flex-1 min-w-0">
																		<div className="flex justify-between items-baseline gap-2">
																			<span className="font-medium truncate text-xs">{champ.name}</span>
																		</div>
																		<div className="text-[10px] text-primary font-medium font-mono">
																			{(closest_item.type === 'M7' ? champ.points_to_m7 : champ.points_to_m10).toLocaleString()} pts needed
																		</div>
																	</div>
																</div>
															))}
														</div>
													)}
												</div>
											</div>
										</DialogTrigger>
										<DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
											<DialogHeader>
												<DialogTitle>Mastery Class Challenge Progress</DialogTitle>
											</DialogHeader>
											<div className="space-y-4 pt-4">
												{all_progress_items.map(item => (
													<div key={item.id} className="p-4 border rounded-lg space-y-3 bg-card">
														<div className="flex justify-between items-center border-b pb-2">
															<div className="flex items-center gap-2">
																<span className="font-semibold text-base">{item.class_name} Class</span>
																<Badge variant="secondary" className={item.type === 'M7' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' : 'bg-blue-400/10 text-blue-400 hover:bg-blue-400/20'}>
																	{item.type}
																</Badge>
															</div>
															<div className="flex items-center gap-3 text-sm">
																<span className="text-muted-foreground text-xs">
																	{item.progress.possible ? `${item.progress.total.toLocaleString()} pts needed` : `Need ${item.progress.champions_needed - item.progress.available} more`}
																</span>
																<span className="font-medium">{item.info.current} / {item.info.next_threshold}</span>
															</div>
														</div>
														{item.progress.possible && (
															<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
																{item.champions.filter(c => item.progress.selected_ids?.includes(c.id)).map(champ => (
																	<div key={champ.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border">
																		<ChampionMasteryIcon data={champ.mastery} className="w-8 h-8" />
																		<div className="flex-1 min-w-0">
																			<div className="flex justify-between items-baseline gap-2">
																				<span className="font-medium truncate text-xs">{champ.name}</span>
																			</div>
																			<div className="text-[10px] text-primary font-medium font-mono">
																				{(item.type === 'M7' ? champ.points_to_m7 : champ.points_to_m10).toLocaleString()} pts needed
																			</div>
																		</div>
																	</div>
																))}
															</div>
														)}
													</div>
												))}
											</div>
										</DialogContent>
									</Dialog>
								</>
							);
						})()}
					</CardContent>
				</Card>
			</div>


			{/* Champion Mastery List */}
			<div className="space-y-3">
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<div className="flex items-center gap-2 flex-wrap">
							<Input
								value={search}
								onChange={(e) => set_search(e.target.value)}
								className="w-[180px] h-9"
								placeholder="Search champions..."
							/>
							<Select value={selected_class} onValueChange={set_selected_class}>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Class" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Classes</SelectItem>
									{classes.map(c => (
										<SelectItem key={c} value={c}>{c}</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={selected_region} onValueChange={set_selected_region} disabled={!has_lcu_data}>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Region" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Regions</SelectItem>
									{regions.map(r => (
										<SelectItem key={r} value={r}>{r}</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={mastery_filter} onValueChange={(v) => set_mastery_filter(v as MasteryFilter)}>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Hide above" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">Show all</SelectItem>
									<SelectItem value="goal">Hide above goal</SelectItem>
									<SelectItem value="m5">Hide M5+</SelectItem>
									<SelectItem value="m7">Hide M7+</SelectItem>
									<SelectItem value="m10">Hide M10+</SelectItem>
									<SelectItem value="custom">Hide above pts</SelectItem>
								</SelectContent>
							</Select>
							{mastery_filter === "custom" && (
								<Input
									type="number"
									value={custom_mastery_points}
									onChange={(e) => set_custom_mastery_points(e.target.value)}
									className="w-[110px] h-9"
									placeholder="Points"
								/>
							)}
						</div>
						<Select value={goal_mode} onValueChange={(v) => set_goal_mode(v as GoalMode)}>
							<SelectTrigger className="w-[120px]">
								<SelectValue placeholder="Goal" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="max">Max Goal</SelectItem>
								<SelectItem value="custom">Custom</SelectItem>
								<SelectItem value="next">Next Level</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{goal_mode === "custom" && goal_ticks.length > 0 && (
						<div className="space-y-2 rounded-md border bg-muted/20 px-3 py-2">
							<div className="flex items-center justify-between gap-2 text-xs">
								<span className="text-muted-foreground">Custom goal</span>
								<div className="flex items-center gap-2">
									{selected_goal_tick?.icon && (
										<img src={selected_goal_tick.icon} alt="" className="w-4 h-4 shrink-0 object-cover rounded-full" />
									)}
									<span className="font-medium">{format_goal_points(custom_goal_points)}</span>
									<Input
										type="number"
										min={1}
										value={custom_goal_input}
										onChange={(e) => set_goal_from_input(e.target.value)}
										className="w-[110px] h-7 text-xs"
										placeholder="Points"
									/>
								</div>
							</div>
							{/* Outer pad keeps edge icons circular; tick row matches thumb travel so the bar reaches the end ticks */}
							<div className="px-2.5 overflow-visible">
								<input
									type="range"
									min={0}
									max={goal_ticks.length - 1}
									step={1}
									value={slider_goal_index}
									onChange={(e) => set_goal_from_tick(Number(e.target.value))}
									className="custom-goal-slider w-full"
								/>
								<div className="relative h-10 mt-1 mx-1.5 overflow-visible">
									{goal_ticks.map((tick, index) => {
										const left = goal_ticks.length === 1 ? 50 : (index / (goal_ticks.length - 1)) * 100;
										const is_selected = selected_goal_tick?.points === tick.points;
										return (
											<Tooltip key={`${tick.kind}-${tick.points}-${tick.label}`}>
												<TooltipTrigger asChild>
													<button
														type="button"
														onClick={() => set_goal_from_tick(index)}
														className={cn(
															"absolute top-0 -translate-x-1/2 flex flex-col items-center gap-0.5 w-5",
															is_selected ? "opacity-100" : "opacity-70 hover:opacity-100",
														)}
														style={{ left: `${left}%` }}
													>
														<span className={cn("h-2 w-0.5 rounded-full", is_selected ? "bg-primary" : "bg-muted-foreground/50")} />
														{tick.icon ? (
															<img
																src={tick.icon}
																alt={tick.label}
																className={cn(
																	"block w-5 h-5 shrink-0 object-cover rounded-full",
																	is_selected && "ring-1 ring-primary",
																)}
															/>
														) : (
															<span className={cn("text-[9px] leading-none whitespace-nowrap", is_selected ? "text-primary" : "text-muted-foreground")}>
																{tick.label}
															</span>
														)}
													</button>
												</TooltipTrigger>
												<TooltipContent>
													<p>{tick.label} · {tick.points.toLocaleString()} pts</p>
												</TooltipContent>
											</Tooltip>
										);
									})}
								</div>
							</div>
						</div>
					)}

					<div className="flex items-center gap-4 flex-wrap">
						<div className="flex items-center gap-2">
							<Checkbox
								id="m7-path-filter"
								checked={show_m7_path}
								onCheckedChange={(checked) => set_show_m7_path(checked === true)}
								disabled={!optimal_path}
							/>
							<Label htmlFor="m7-path-filter" className="text-sm cursor-pointer">
								M7 path
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="m10-path-filter"
								checked={show_m10_path}
								onCheckedChange={(checked) => set_show_m10_path(checked === true)}
								disabled={!optimal_path}
							/>
							<Label htmlFor="m10-path-filter" className="text-sm cursor-pointer">
								M10 path
							</Label>
						</div>
						<Tabs value={champion_type} onValueChange={(v) => set_champion_type(v as ChampionTypeFilter)}>
							<TabsList>
								<TabsTrigger value="all">All</TabsTrigger>
								<TabsTrigger value="classic">Classic</TabsTrigger>
								<TabsTrigger value="non_classic">Non-classic</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				</div>

				<Separator />

				{filtered_champions.length === 0 ? (
					<p className="text-sm text-muted-foreground py-8 text-center">No champions match the selected filters.</p>
				) : (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
						{filtered_champions.map(champ => {
							const is_on_m7_path = m7_path_ids.has(Number(champ.id));
							const is_on_m10_path = m10_path_ids.has(Number(champ.id));
							const ct = champion_targets.get(champ.id);
							return (
								<div key={champ.id} className={cn(
									"p-2 rounded-md border bg-card text-card-foreground flex flex-col gap-1.5",
									is_on_m10_path ? "border-purple-500 ring-1 ring-purple-500/80" : is_on_m7_path ? "border-blue-500 ring-1 ring-blue-500/80" : "border-border",
								)}>
									<div className="flex items-center gap-2">
										<ChampionMasteryIcon data={champ.mastery} className="w-8 h-8 shrink-0" />
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-1 min-w-0">
												<span className="font-medium truncate text-xs">{champ.name}</span>
												{is_on_m7_path && (
													<Tooltip>
														<TooltipTrigger asChild>
															<Badge variant="outline" className="text-[8px] px-1 py-0 leading-tight bg-blue-500 text-white border-transparent shrink-0">M7</Badge>
														</TooltipTrigger>
														<TooltipContent><p>On M7 optimal path</p></TooltipContent>
													</Tooltip>
												)}
												{is_on_m10_path && (
													<Tooltip>
														<TooltipTrigger asChild>
															<Badge variant="outline" className="text-[8px] px-1 py-0 leading-tight bg-purple-500 text-white border-transparent shrink-0">M10</Badge>
														</TooltipTrigger>
														<TooltipContent><p>On M10 optimal path</p></TooltipContent>
													</Tooltip>
												)}
											</div>
											{champ.roles.length > 0 && (
												<div className="flex items-center gap-1 mt-0.5 flex-wrap">
													{champ.roles.slice(0, 2).map(role => (
														<Badge key={role} variant="outline" className="text-[8px] px-1 py-0 leading-tight">{role}</Badge>
													))}
												</div>
											)}
											<div className="text-[10px] text-muted-foreground font-mono mt-0.5">
												M{champ.mastery_level} · {champ.mastery_points.toLocaleString()} pts
											</div>
										</div>
									</div>
									{ct && (
										<div className="flex items-center gap-1">
											<Progress
												value={ct.progress * 100}
												className="h-1 bg-muted flex-1"
												indicatorClassName={ct.progress >= 1 ? "bg-yellow-400" : "bg-primary"}
											/>
											<span className="text-[10px] text-primary font-medium tabular-nums shrink-0">{ct.label}</span>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
