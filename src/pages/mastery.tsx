import { useMemo, useState } from "react";
import { default_mastery_data, useStaticData } from "@/data_context";
import { challenge_icon, classes, get_level_color, get_progress_color } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, ResponsiveContainer, Text, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { levels } from "@/lib/utils";
import { ChampionMasteryIcon } from "@/components/champion_mastery_icon";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import {
	M7_CHALLENGES as m7_challenges,
	M10_CHALLENGES as m10_challenges,
	MASTERY_HEADLINE_CHALLENGES,
} from "@/lib/challenges";

const mastery_per_level = [0, 1800, 4200, 6600, 9000, 10000, 11000, 11000, 11000]; // mastery to get to the next level from this level

function points_to_target_level(current_level: number, current_points_until_next: number, target_level: number) {
	if (current_level >= target_level) return 0;
	let points = current_points_until_next;
	for (let l = current_level + 1; l < target_level; l++) {
		points += mastery_per_level[l] || 11000;
	}
	return points;
}

export default function Mastery() {
	const { static_data, has_lcu_data } = useStaticData();
	const [hide_filters, set_hide_filters] = useState<Record<string, { hide_m7: boolean; hide_m10: boolean }>>(() => {
		const initial: Record<string, { hide_m7: boolean; hide_m10: boolean }> = {};
		for (const cls of classes) {
			initial[cls] = { hide_m7: false, hide_m10: true };
		}
		return initial;
	}); 

	const class_data = useMemo(() => {
		if (!has_lcu_data) return [];
		
		const result = classes.map((class_name, index) => {
			const m7_id = m7_challenges[index];
			const m10_id = m10_challenges[index];
			const m7_challenge = static_data.lcu_data[m7_id];
			const m10_challenge = static_data.lcu_data[m10_id];

			if (!m7_challenge || !m10_challenge) return null;

			const available_ids = m7_challenge.availableIds || [];
			const champions = available_ids.filter((id: number) => id <= 3000).map((id: number) => {
				const champ = static_data.champion_map[id];
				const mastery = static_data.mastery_data.find(m => m.championId === id) || { ...default_mastery_data, championId: id };
				
				const points_to_m7 = points_to_target_level(mastery.championLevel, mastery.championPointsUntilNextLevel, 7);
				const points_to_m10 = points_to_target_level(mastery.championLevel, mastery.championPointsUntilNextLevel, 10);

				return {
					id,
					name: champ?.name || `Champion ${id}`,
					mastery_level: mastery.championLevel,
					mastery_points: mastery.championPoints,
					points_to_m7,
					points_to_m10,
					mastery
				};
			});

			champions.sort((a, b) => {
				if (a.mastery_level !== b.mastery_level) return b.mastery_level - a.mastery_level;
				return b.mastery_points - a.mastery_points;
			});

			const get_thresholds = (challenge: any) => {
				const thresholds = Object.entries(challenge.thresholds).sort(([, a]: any, [, b]: any) => a.value - b.value).map(([, v]: any) => v.value);
				const current = challenge.currentValue;
				const next_threshold = thresholds.find(t => t > current) || thresholds[thresholds.length - 1];
				const master_threshold = challenge.thresholds["MASTER"]?.value || thresholds[thresholds.length - 1];
				return { current, next_threshold, master_threshold };
			};

			const m7_info = get_thresholds(m7_challenge);
			const m10_info = get_thresholds(m10_challenge);

			// total points to master
			const calc_totals = (points_key: 'points_to_m7' | 'points_to_m10', current: number, target: number) => {
				const needed = Math.max(0, target - current);
				const eligible = champions.filter(c => c[points_key] > 0).sort((a, b) => a[points_key] - b[points_key]);
				// not enough cdhamps for master tier
				if (eligible.length < needed) {
					return { possible: false, total: 0, champions_needed: needed, available: eligible.length };
				}
				const selected = eligible.slice(0, needed);
				const total = selected.reduce((sum, c) => sum + c[points_key], 0);
				return { possible: true, total, selected_ids: selected.map(c => c.id), champions_needed: needed, available: eligible.length };
			};

			const m7_progress = calc_totals('points_to_m7', m7_info.current, m7_info.next_threshold);
			const m7_master = calc_totals('points_to_m7', m7_info.current, m7_info.master_threshold);
			const m10_progress = calc_totals('points_to_m10', m10_info.current, m10_info.next_threshold);
			const m10_master = calc_totals('points_to_m10', m10_info.current, m10_info.master_threshold);

			const m7_closest = m7_progress.possible ? m7_progress.total : Infinity;
			const m10_closest = m10_progress.possible ? m10_progress.total : Infinity;
			const closest_type = m7_closest <= m10_closest ? 'M7' as const : 'M10' as const;

			return {
				class_name,
				m7_challenge,
				m10_challenge,
				m7_info,
				m10_info,
				m7_progress,
				m7_master,
				m10_progress,
				m10_master,
				champions,
				closest_type
			};
		}).filter(x => x !== null);

		return result;
	}, [has_lcu_data, static_data]);

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

	const optimal_path = useMemo(() => {
		if (class_data.length === 0) return null;

		const compute_path = (target: 'M7' | 'M10') => {
			const points_key = target === 'M7' ? 'points_to_m7' as const : 'points_to_m10' as const;

			interface ClassNeed {
				class_name: string;
				remaining: number;
				original_remaining: number;
				impossible: boolean;
				eligible_ids: Set<number>;
				total_in_class: number;
			}

			const class_needs: ClassNeed[] = [];
			const champ_map = new Map<number, {
				data: typeof class_data[0]['champions'][0];
				class_indices: Set<number>;
				points: number;
			}>();

			class_data.forEach((cd, i) => {
				const info = target === 'M7' ? cd.m7_info : cd.m10_info;
				const original_remaining = Math.max(0, info.master_threshold - info.current);
				const eligible = cd.champions.filter(c => c[points_key] > 0);
				const impossible = eligible.length < original_remaining;
				const remaining = Math.min(original_remaining, eligible.length);

				class_needs.push({
					class_name: cd.class_name,
					remaining,
					original_remaining,
					impossible,
					eligible_ids: new Set(eligible.map(c => c.id)),
					total_in_class: cd.champions.length,
				});

				eligible.forEach(c => {
					if (!champ_map.has(c.id)) {
						champ_map.set(c.id, { data: c, class_indices: new Set(), points: c[points_key] });
					}
					champ_map.get(c.id)!.class_indices.add(i);
				});
			});

			const remaining = class_needs.map(cn => cn.remaining);
			const selected_ids = new Set<number>();
			const selection_order: number[] = [];

			// add all champs for impossible classes
			class_needs.forEach((cn) => {
				if (cn.impossible) {
					cn.eligible_ids.forEach(id => {
						if (!selected_ids.has(id)) {
							selected_ids.add(id);
							selection_order.push(id);
							champ_map.get(id)!.class_indices.forEach(ci => {
								remaining[ci] = Math.max(0, remaining[ci] - 1);
							});
						}
					});
				}
			});

			// keep adding champs based on the ratio of class coverage to total points required to level it
			while (remaining.some(r => r > 0)) {
				let best_id: number | null = null;
				let best_score = -Infinity;

				for (const [id, info] of champ_map) {
					if (selected_ids.has(id)) continue;
					let coverage = 0;
					info.class_indices.forEach(ci => { if (remaining[ci] > 0) coverage++; });
					if (coverage === 0) continue;
					const score = coverage / Math.max(info.points, 1);
					if (score > best_score || (score === best_score && best_id !== null && info.points < champ_map.get(best_id)!.points)) {
						best_score = score;
						best_id = id;
					}
				}

				if (best_id === null) break;
				selected_ids.add(best_id);
				selection_order.push(best_id);
				champ_map.get(best_id)!.class_indices.forEach(ci => {
					remaining[ci] = Math.max(0, remaining[ci] - 1);
				});
			}

			const selected_champs = selection_order.map(id => {
				const info = champ_map.get(id)!;
				const classes_contributed = [...info.class_indices].map(ci => class_data[ci].class_name);

				// check if champion has higher mastery than all non-selected champions in its classes
				let higher_than_all = true;
				for (const ci of info.class_indices) {
					const non_selected = class_data[ci].champions.filter(
						c => c[points_key] > 0 && !selected_ids.has(c.id)
					);
					if (non_selected.some(c => c.mastery_points > info.data.mastery_points)) {
						higher_than_all = false;
						break;
					}
				}

				return {
					...info.data,
					classes_contributed,
					higher_than_all,
					points_needed: info.points,
				};
			});

			const total_points = selected_champs.reduce((sum, c) => sum + c.points_needed, 0);
			const dual_class_count = selected_champs.filter(c => c.classes_contributed.length > 1).length;

			selected_champs.sort((a, b) => b.mastery_points - a.mastery_points);

			return {
				champions: selected_champs,
				total_points,
				total_champions: selected_champs.length,
				dual_class_count,
				class_needs,
				impossible_classes: class_needs.filter(cn => cn.impossible).map(cn => cn.class_name),
			};
		};

		return { m7: compute_path('M7'), m10: compute_path('M10') };
	}, [class_data]);

	const m10_path_ids = useMemo(
		() => new Set(optimal_path?.m10.champions.map(c => c.id) ?? []),
		[optimal_path]
	);

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
							<div className="grid grid-cols-2 gap-1.5">
								{([['m7', 'M7', optimal_path.m7] as const, ['m10', 'M10', optimal_path.m10] as const]).map(([key, label, path]) => {
									if (!path || path.champions.length === 0) return null;
									return (
										<Dialog key={key}>
											<DialogTrigger asChild>
												<div className="p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors group">
													<div className="flex items-center justify-between">
														<span className="text-xs font-semibold group-hover:text-foreground transition-colors">Optimal {label} Path</span>
														<div className="flex items-center gap-1.5">
															{path.impossible_classes.length > 0 && (
																<Tooltip>
																	<TooltipTrigger asChild>
																		<Badge variant="outline" className="text-amber-500 border-amber-500/50 gap-0.5 text-[9px] px-1 py-0">
																			<AlertTriangle className="w-2.5 h-2.5" />
																			{path.impossible_classes.join(", ")}
																		</Badge>
																	</TooltipTrigger>
																	<TooltipContent>
																		<p>Not enough champions to reach Master tier — all eligible included</p>
																	</TooltipContent>
																</Tooltip>
															)}
															<span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">→</span>
														</div>
													</div>
													<div className="text-[10px] text-muted-foreground mt-0.5">
														{path.total_champions} champs{path.dual_class_count > 0 && ` · ${path.dual_class_count} dual-class`}
													</div>
													<div className="text-[10px] text-muted-foreground">
														{path.total_points.toLocaleString()} pts needed
													</div>
												</div>
											</DialogTrigger>
											<DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
												<DialogHeader>
													<DialogTitle>Optimal {label} Path to Master Tier</DialogTitle>
												</DialogHeader>
												<div className="space-y-4 pt-2">
													<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
														{path.class_needs.map(cn => (
															<div key={cn.class_name} className="p-2 border rounded-md text-xs space-y-0.5">
																<div className="flex items-center justify-between">
																	<span className="font-medium">{cn.class_name}</span>
																	{cn.impossible && <AlertTriangle className="w-3 h-3 text-amber-500" />}
																</div>
																<div className="text-muted-foreground">
																	Need {cn.remaining} more{cn.impossible && ` (${cn.original_remaining} needed, only ${cn.total_in_class} exist)`}
																</div>
															</div>
														))}
													</div>

													<Separator />

													<div className="flex flex-wrap gap-4 text-sm">
														<div><span className="text-muted-foreground">Champions:</span> <span className="font-medium">{path.total_champions}</span></div>
														<div><span className="text-muted-foreground">Total pts:</span> <span className="font-medium">{path.total_points.toLocaleString()}</span></div>
														<div><span className="text-muted-foreground">Dual-class:</span> <span className="font-medium">{path.dual_class_count}</span></div>
														<div className="flex items-center gap-1">
															<CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
															<span className="text-muted-foreground">= higher mastery than all non-path champs in class</span>
														</div>
													</div>

													<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
														{path.champions.map(champ => (
															<div key={champ.id} className={`p-2 rounded-md border bg-card flex items-center gap-2 ${champ.higher_than_all ? 'border-green-500/30' : 'border-amber-500/30'}`}>
																<ChampionMasteryIcon data={champ.mastery} className="w-8 h-8 shrink-0" />
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-1">
																		<span className="font-medium truncate text-xs">{champ.name}</span>
																		{champ.higher_than_all
																			? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
																			: <Tooltip><TooltipTrigger asChild><AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 cursor-help" /></TooltipTrigger><TooltipContent><p>A non-path champion in the same class has higher mastery</p></TooltipContent></Tooltip>
																		}
																	</div>
																	<div className="flex items-center gap-1 mt-0.5">
																		{champ.classes_contributed.map(cls => (
																			<Badge key={cls} variant="outline" className="text-[8px] px-1 py-0 leading-tight">{cls}</Badge>
																		))}
																	</div>
																	<div className="text-[10px] text-primary font-medium font-mono mt-0.5">
																		{champ.points_needed.toLocaleString()} pts to {label}
																	</div>
																</div>
															</div>
														))}
													</div>
												</div>
											</DialogContent>
										</Dialog>
									);
								})}
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


			{/* Class Details */}
			<div className="space-y-8">
				{class_data.map((data) => (
					<Card key={data.class_name}>
						<CardHeader className="py-4 px-5">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<CardTitle className="text-base flex items-center gap-2">
										{data.class_name}
										<span className="text-xs text-muted-foreground font-normal">({data.champions.length} champions / {data.m10_info.master_threshold} needed)</span>
									</CardTitle>
									<div className="flex gap-1">
										<Button
											variant={hide_filters[data.class_name]?.hide_m7 ? "default" : "outline"}
											size="sm"
											className="h-5 text-[10px] px-1.5 gap-1"
											onClick={() => set_hide_filters(prev => ({
												...prev,
												[data.class_name]: {
													hide_m7: !prev[data.class_name]?.hide_m7,
													hide_m10: prev[data.class_name]?.hide_m10 ?? false,
												}
											}))}
										>
											{hide_filters[data.class_name]?.hide_m7 ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
											M7+
										</Button>
										<Button
											variant={hide_filters[data.class_name]?.hide_m10 ? "default" : "outline"}
											size="sm"
											className="h-5 text-[10px] px-1.5 gap-1"
											onClick={() => set_hide_filters(prev => ({
												...prev,
												[data.class_name]: {
													hide_m7: prev[data.class_name]?.hide_m7 ?? false,
													hide_m10: !prev[data.class_name]?.hide_m10,
												}
											}))}
										>
											{hide_filters[data.class_name]?.hide_m10 ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
											M10+
										</Button>
									</div>
								</div>
								<div className="flex gap-4">
									<div className="text-right">
										<div className="text-xs font-medium">M7 ({data.m7_info.current}/{data.m7_info.next_threshold})</div>
										<Progress value={Math.min((data.m7_info.current / data.m7_info.next_threshold) * 100, 100)} className="h-1 my-1 bg-muted" indicatorClassName="bg-blue-500" />
										<div className="text-[10px] text-muted-foreground">
											Prog: {data.m7_progress.possible ? `${data.m7_progress.total.toLocaleString()}` : <span className="text-red-500 font-medium">Need {data.m7_progress.champions_needed - data.m7_progress.available} more</span>} 
											<span className="mx-1">|</span>
											Mast: {data.m7_master.possible ? `${data.m7_master.total.toLocaleString()}` : <span className="text-red-500 font-medium">Need {data.m7_master.champions_needed - data.m7_master.available} more</span>}
										</div>
									</div>
									<div className="text-right">
										<div className="text-xs font-medium">M10 ({data.m10_info.current}/{data.m10_info.next_threshold})</div>
										<Progress value={Math.min((data.m10_info.current / data.m10_info.next_threshold) * 100, 100)} className="h-1 my-1 bg-muted" indicatorClassName="bg-blue-500" />
										<div className="text-[10px] text-muted-foreground">
											Prog: {data.m10_progress.possible ? `${data.m10_progress.total.toLocaleString()}` : <span className="text-red-500 font-medium">Need {data.m10_progress.champions_needed - data.m10_progress.available} more</span>}
											<span className="mx-1">|</span>
											Mast: {data.m10_master.possible ? `${data.m10_master.total.toLocaleString()}` : <span className="text-red-500 font-medium">Need {data.m10_master.champions_needed - data.m10_master.available} more</span>}
										</div>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-0 pb-4 px-4">
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
								{data.champions.filter(champ => {
									const filters = hide_filters[data.class_name];
									if (filters?.hide_m7 && champ.mastery_level >= 7) return false;
									if (filters?.hide_m10 && champ.mastery_level >= 10) return false;
									return true;
								}).map(champ => {
									const is_m7_progress = data.m7_progress.selected_ids?.includes(champ.id);
									const is_m7_master = data.m7_master.selected_ids?.includes(champ.id);
									const is_m10_progress = data.m10_progress.selected_ids?.includes(champ.id);
									const is_m10_master = data.m10_master.selected_ids?.includes(champ.id);

									const is_m10_path = m10_path_ids.has(champ.id);

									return (
										<div key={champ.id} className={`p-2 rounded-md border bg-card text-card-foreground flex flex-col gap-1.5 ${is_m10_path ? 'border-purple-500/50' : ''}`}>
											<div className="flex items-center gap-2">
												<ChampionMasteryIcon data={champ.mastery} className="w-8 h-8" />
												<div className="flex-1 min-w-0">
													<div className="font-medium truncate text-xs">{champ.name}</div>
													<div className="flex items-center gap-1 mt-0.5">
														{(() => {
															const m7_done = champ.mastery_level >= 7;
															const m7_color = m7_done ? "bg-green-500 text-white border-transparent" : is_m7_progress ? "bg-orange-500 text-white border-transparent" : is_m7_master ? "bg-red-500 text-white border-transparent" : "";
															const m7_tooltip = m7_done ? "Already Mastery 7+" : is_m7_progress ? `Needed for next tier (${champ.points_to_m7.toLocaleString()} pts)` : is_m7_master ? `Needed for Master tier (${champ.points_to_m7.toLocaleString()} pts)` : `Not required (${champ.points_to_m7 > 0 ? champ.points_to_m7.toLocaleString() + ' pts to M7' : 'Done'})`;
															const m10_done = champ.mastery_level >= 10;
															const m10_color = m10_done ? "bg-green-500 text-white border-transparent" : is_m10_progress ? "bg-orange-500 text-white border-transparent" : is_m10_master ? "bg-red-500 text-white border-transparent" : "";
															const m10_tooltip = m10_done ? "Already Mastery 10+" : is_m10_progress ? `Needed for next tier (${champ.points_to_m10.toLocaleString()} pts)` : is_m10_master ? `Needed for Master tier (${champ.points_to_m10.toLocaleString()} pts)` : `Not required (${champ.points_to_m10 > 0 ? champ.points_to_m10.toLocaleString() + ' pts to M10' : 'Done'})`;
															const path_color = is_m10_path ? "bg-purple-500 text-white border-transparent" : "";
															const path_tooltip = is_m10_path ? `On M10 optimal path (${champ.points_to_m10.toLocaleString()} pts to M10)` : "Not on M10 optimal path";
															return (
																<>
																	<Tooltip><TooltipTrigger asChild><Badge variant="outline" className={`text-[9px] px-1 py-0 leading-tight cursor-help ${m7_color}`}>M7</Badge></TooltipTrigger><TooltipContent><p>{m7_tooltip}</p></TooltipContent></Tooltip>
																	<Tooltip><TooltipTrigger asChild><Badge variant="outline" className={`text-[9px] px-1 py-0 leading-tight cursor-help ${m10_color}`}>M10</Badge></TooltipTrigger><TooltipContent><p>{m10_tooltip}</p></TooltipContent></Tooltip>
																	<Tooltip><TooltipTrigger asChild><Badge variant="outline" className={`text-[9px] px-1 py-0 leading-tight cursor-help ${path_color}`}>Path</Badge></TooltipTrigger><TooltipContent><p>{path_tooltip}</p></TooltipContent></Tooltip>
																</>
															);
														})()}
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
