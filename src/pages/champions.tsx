import { useEffect, useMemo, useState } from "react";
import { APIMasteryDataEntry, useData } from "@/data_context.tsx";
import { challenge_icon, SortDirection } from "@/lib/utils.ts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, Check, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, ResponsiveContainer, Text, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FilterDropdown } from "@/components/filter_dropdown.tsx";

const classes = ["Assassin", "Fighter", "Mage", "Marksman", "Support", "Tank"];
// const classes = ["assassin", "fighter", "mage", "marksman", "support", "tank"];
const m7_challenges = [401201, 401202, 401203, 401204, 401205, 401206];
const m10_challenges = [401207, 401208, 401209, 401210, 401211, 401212];

type ChampionTableRow = {
	name: string;
	roles: string[];
	mastery_level: number;
	mastery_points: number;
	icon_url: string;
	points_since_last_level: number;
	points_until_next_level: number;
	checks: boolean[];
}

const default_mastery_data: APIMasteryDataEntry = {
	championId: 0,
	championLevel: 0,
	championPoints: 0,
	championPointsSinceLastLevel: 0,
	championPointsUntilNextLevel: 0,
	markRequiredForNextLevel: 0,
	milestoneGrades: [],
	nextSeasonMilestone: {
		requireGradeCounts: {}
	},
	tokensEarned: 0
};

const mastery_colors: { [key: number]: string } = {
	10: "bg-red-500 hover:bg-red-600 text-white border-transparent",
	9: "bg-orange-500 hover:bg-orange-600 text-white border-transparent",
	8: "bg-purple-500 hover:bg-purple-600 text-white border-transparent",
	7: "bg-blue-500 hover:bg-blue-600 text-white border-transparent",
	6: "bg-green-500 hover:bg-green-600 text-white border-transparent",
	5: "bg-gray-500 hover:bg-gray-600 text-white border-transparent"
};

function mastery_color(level: number): string {
	if (level >= 10) {
		return mastery_colors[10];
	}
	return mastery_colors[level] || "";
}

export default function Champions() {
	const { data } = useData();
	const [champion_table_data, set_champion_table_data] = useState<ChampionTableRow[]>([]);
	const [selected_roles, set_selected_roles] = useState<string[]>([]);
	const [search, set_search] = useState<string>('');
	const [sort_field, set_sort_field] = useState<keyof ChampionTableRow>('mastery_level');
	const [sort_direction, set_sort_direction] = useState<SortDirection>('desc');
	const tracked_challenges = [101301, 120002, 202303, 210001, 210002, 401106, 505001, 602002, 602001];
	const [selected_challenges, set_selected_challenges] = useState(tracked_challenges);

	useEffect(() => {
		set_champion_table_data(Object.entries(data.champion_map).map(([id, champion]) => {
			const current_mastery_data = data.mastery_data.find(x => x.championId === parseInt(id)) || default_mastery_data;
			return {
				name: champion.name,
				roles: champion.roles,
				mastery_level: current_mastery_data.championLevel,
				mastery_points: current_mastery_data.championPoints,
				icon_url: champion.squarePortraitPath,
				points_since_last_level: current_mastery_data.championPointsSinceLastLevel,
				points_until_next_level: current_mastery_data.championPointsUntilNextLevel,
				checks: tracked_challenges.map(x => data.lcu_data[x]?.completedIds.includes(parseInt(id)))
			};
		}));
	}, [data.champion_map, data.mastery_data, data.lcu_data]);

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

	useEffect(() => {
		if (Object.keys(data.lcu_data).length === 0) {
			return;
		}
	}, [data.lcu_data]);

	const filtered_table_data = useMemo(() => {
		return sorted_table_data.filter(item => {
			const roleMatch = selected_roles.length === 0 || item.roles.some(role => selected_roles.map(x => x.toLowerCase()).includes(role));
			const nameMatch = search === '' || item.name.toLowerCase().includes(search.toLowerCase());

			return roleMatch && nameMatch;
		});
	}, [sorted_table_data, selected_roles, search]);

	const catch_em_all = useMemo(() => {
		if (!data.has_lcu_data) {
			return -1;
		}
		return data.lcu_data[401101].currentValue;
	}, [filtered_table_data]);

	return (
		<div className="p-6 space-y-6">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Mastery Class Challenges</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={{
							diff: { label: "Mastery 7", color: "#2563eb" },
							m10: { label: "Mastery 10", color: "#60a5fa" }
						}} className="min-h-[100px]">
							<div className="flex flex-wrap">
								{classes.map((class_name, index) => {
									if (!data.has_lcu_data) {
										return null;
									}

									const m7_thresholds = Object.entries(data.lcu_data[m7_challenges[index]].thresholds).sort(([, a], [_, b]) => a.value - b.value).map(value => value[1].value);
									const m10_thresholds = Object.entries(data.lcu_data[m10_challenges[index]].thresholds).sort(([, a], [_, b]) => a.value - b.value).map(value => value[1].value);
									const m7_current = data.lcu_data[m7_challenges[index]].currentValue;
									const m10_current = data.lcu_data[m10_challenges[index]].currentValue;
									const m7_max = data.lcu_data[m7_challenges[index]].thresholds["MASTER"].value;
									//const m10_max = data.lcu_data[m10_challenges[index]].thresholds["MASTER"].value;

									const chart_data = [{
										name: class_name,
										m7: m7_current,
										diff: m7_current - m10_current,
										m10: m10_current
									}];

									for (let i = 0; i < m7_thresholds.length; i++) {
										if (m7_thresholds[i] != m10_thresholds[i]) {
											console.error("m7_thresholds and m10_thresholds are not equal");
											break;
										}
									}

									return (
										<div className="flex-1 min-w-[70px]" key={class_name}>
											<ResponsiveContainer width="100%" height={250}>
												<BarChart data={chart_data}>
													<ChartTooltip
														wrapperStyle={{ zIndex: 100 }}
														content={
															<ChartTooltipContent
																formatter={(value, name, _item) => {
																	const displayValue = name === "diff" ? m7_current : value;
																	return <div className="flex items-center justify-between gap-2">
																		<div className="flex items-center gap-2">
																			<div
																				className="h-2.5 w-1 shrink-0 rounded-[2px]"
																				style={{
																					backgroundColor: name === "diff" ? "#2563eb" : "#60a5fa"
																				}}
																			/>
																			<span className="text-muted-foreground">
																					{name === "diff" ? "Mastery 7" : "Mastery 10"}
																				</span>
																		</div>
																		<span className="font-mono font-medium tabular-nums text-foreground">
																				{displayValue}
																			</span>
																	</div>;
																}}
															/>
														}
													/>
													<XAxis dataKey="name" interval={0} />
													<YAxis 
														width={20} 
														ticks={m7_thresholds.filter(value => value >= m10_current)} 
														domain={[0, m7_max]} 
														interval={0}
														tick={(props) => {
															const { payload } = props;

															const colors = {
																[m7_thresholds[0]]: "#51484a", // iron
																[m7_thresholds[1]]: "#8c513a", // bronze
																[m7_thresholds[2]]: "#80989d", // silver
																[m7_thresholds[3]]: "#cd8837", // gold
																[m7_thresholds[4]]: "#4e9996", // platinum
																[m7_thresholds[5]]: "#576bce", // diamond
																[m7_thresholds[6]]: "#9d48e0"  // master
															};

															props.stroke = colors[payload.value] || "#888888";
															//props.strokeWidth = .5;
															return (
																<Text {...props}>
																	{payload.value}
																</Text>
															);
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
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Summary Statistics</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							temporary
						</div>
					</CardContent>
				</Card>
			</div>
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
						items={tracked_challenges}
						selected_items={selected_challenges}
						set_selected_items={set_selected_challenges}
						item_to_label={(item: number) => data.lcu_data[item].name}
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
							<TableHead>Points until Level</TableHead>
							{selected_challenges.map(x => <TableHead key={x}>
								<Tooltip>
									<TooltipTrigger asChild>
										<img src={challenge_icon(x)} alt="icon" className="w-6 h-6" />
									</TooltipTrigger>
									<TooltipContent>
										<p>{data.lcu_data[x].description} ({data.lcu_data[x].completedIds.length} / {Object.keys(data.champion_map).length})</p>
									</TooltipContent>
								</Tooltip>
							</TableHead>)}
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered_table_data.map((item, i) => (
							<TableRow key={i} className={catch_em_all > 0 && item.mastery_points >= catch_em_all ? "bg-amber-50 dark:bg-amber-950/30" : ""}>
								<TableCell>{item.name}</TableCell>
								<TableCell>
									{item.roles.map((role, j) => (
										<Badge variant="outline" key={j}>{role}</Badge>
									))}
								</TableCell>
								<TableCell><Badge className={mastery_color(item.mastery_level)}>{item.mastery_level}</Badge> {item.mastery_points}</TableCell>
								<TableCell>
									<Tooltip>
										<TooltipTrigger asChild>
											<div>
												<div className="flex items-center gap-2">
													<div className="w-full bg-gray-200 rounded-full h-1 dark:bg-gray-700">
														<div 
															className={`h-1 rounded-full ${item.points_until_next_level <= 0 ? 'bg-green-500' : 'bg-black'}`}
															style={{ 
																width: `${(item.points_since_last_level / (item.points_since_last_level + Math.max(0, item.points_until_next_level))) * 100}%` 
															}}
														></div>
													</div>
												</div>
											</div>
										</TooltipTrigger>
										<TooltipContent>
											<p>{item.points_since_last_level}/{item.points_since_last_level + item.points_until_next_level}</p>
										</TooltipContent>
									</Tooltip>
								</TableCell>
								{selected_challenges.map((challenge, j) => {
									const index = tracked_challenges.indexOf(challenge);
									return (
										<TableCell key={j}>{item.checks[index] ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</TableCell>
									);
								})}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
