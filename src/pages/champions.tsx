import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ChevronDown, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, BarChart, Label, LabelList, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useEffect, useMemo, useState } from "react";
import { MasteryDataEntry, useData } from "@/data_context.tsx";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge.tsx";

const classes = ["Assassin", "Fighter", "Mage", "Marksman", "Support", "Tank"];
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
}

const default_mastery_data: MasteryDataEntry = {
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
}

const mastery_colors: {[key: number]: string} = {
	10: "bg-red-500 hover:bg-red-600 text-white border-transparent",
	9: "bg-orange-500 hover:bg-orange-600 text-white border-transparent",
	8: "bg-purple-500 hover:bg-purple-600 text-white border-transparent",
	7: "bg-blue-500 hover:bg-blue-600 text-white border-transparent",
	6: "bg-green-500 hover:bg-green-600 text-white border-transparent",
	5: "bg-gray-500 hover:bg-gray-600 text-white border-transparent",
}

function mastery_color(level: number): string {
	if (level >= 10) {
		return mastery_colors[10];
	}
	return mastery_colors[level] || "";
}

export default function Champions() {
	const { data } = useData();
	const [mastery_chart_data, set_mastery_chart_data] = useState<any[]>([]);
	const [champion_table_data, set_champion_table_data] = useState<ChampionTableRow[]>([]);
	const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
	const [selected_roles, set_selected_roles] = useState<string[]>([]);
	const [search, set_search] = useState<string>('');
	const [sort_field, set_sort_field] = useState<keyof ChampionTableRow>('mastery_level');
	const [sort_direction, set_sort_direction] = useState<'asc' | 'desc'>('desc');

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
		set_mastery_chart_data(classes.map((c, i) => ({
			class: c,
			m7: data.lcu_data[m7_challenges[i]].currentValue,
			m10: data.lcu_data[m10_challenges[i]].currentValue,
			m7_max: data.lcu_data[m7_challenges[i]].thresholds["MASTER"].value,
			m10_max: data.lcu_data[m10_challenges[i]].thresholds["MASTER"].value,
			m7_percent: data.lcu_data[m7_challenges[i]].currentValue / data.lcu_data[m7_challenges[i]].thresholds["MASTER"].value * 100,
			m10_percent: data.lcu_data[m10_challenges[i]].currentValue / data.lcu_data[m10_challenges[i]].thresholds["MASTER"].value * 100
		})));
	}, [data.lcu_data]);

	const filteredData = useMemo(() => {
		return sorted_table_data.filter(item => {
			const roleMatch = selected_roles.length === 0 || item.roles.some(role => selected_roles.includes(role));
			const nameMatch = search === '' || item.name.toLowerCase().includes(search.toLowerCase());
			
			return roleMatch && nameMatch;
		});
	}, [sorted_table_data, selected_roles, search]);

	return (
		<div className="p-6 space-y-6">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Mastery Class Challenges</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={{
							m7: { label: "Mastery 7", color: "#2563eb" },
							m10: { label: "Mastery 10", color: "#60a5fa" }
						}} className="min-h-[100px]">
							<div className="flex flex-wrap gap-4 flex-row">
							{classes.map((class_name, index) => {
								if (Object.keys(data.lcu_data).length === 0) {
									return <></>;
								}

								const m7_thresholds = Object.entries(data.lcu_data[m7_challenges[index]].thresholds).sort((a, b) => a[1].value - b[1].value).map(value => value[1].value);
								const m10_thresholds = Object.entries(data.lcu_data[m10_challenges[index]].thresholds).sort((a, b) => a[1].value - b[1].value).map(value => value[1].value);
								const m7_current = data.lcu_data[m7_challenges[index]].currentValue;
								const m10_current = data.lcu_data[m10_challenges[index]].currentValue;
								const m7_max = data.lcu_data[m7_challenges[index]].thresholds["MASTER"].value;
								const m10_max = data.lcu_data[m10_challenges[index]].thresholds["MASTER"].value;

								// Create chart data for this class
								const chartData = [
									{
										name: "M7",
										value: m7_current,
										max: m7_max,
										percent: (m7_current / m7_max) * 100,
										color: "var(--color-m7)"
									},
									{
										name: "M10",
										value: m10_current,
										max: m10_max,
										percent: (m10_current / m10_max) * 100,
										color: "var(--color-m10)"
									}
								];

								return (
									<BarChart
										width={150}
										height={150}
										data={chartData}
										margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
										barSize={20}
									>
										<XAxis dataKey="name" />
										<YAxis hide domain={[0, 100]} />
										<ChartTooltip
											content={<ChartTooltipContent
												labelKey="name"
												indicator="line"
												formatter={(value, name, item) => (
													<div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-medium">
                        {item.payload.value}/{item.payload.max}
                      </span>
													</div>
												)}
											/>}
										/>

										{/* Threshold reference lines */}
										{/*{name === "M7" ?*/}
										{/*	m7_thresholds.map(([key, value]) => (*/}
										{/*		<ReferenceLine*/}
										{/*			key={`m7-${key}`}*/}
										{/*			y={(value.value / m7_max) * 100}*/}
										{/*			stroke="#888"*/}
										{/*			strokeDasharray="3 3"*/}
										{/*		>*/}
										{/*			<Label value={value.value} position="right" fontSize={10} />*/}
										{/*		</ReferenceLine>*/}
										{/*	)) :*/}
										{/*	m10_thresholds.map(([key, value]) => (*/}
										{/*		<ReferenceLine*/}
										{/*			key={`m10-${key}`}*/}
										{/*			y={(value.value / m10_max) * 100}*/}
										{/*			stroke="#888"*/}
										{/*			strokeDasharray="3 3"*/}
										{/*		>*/}
										{/*			<Label value={value.value} position="right" fontSize={10} />*/}
										{/*		</ReferenceLine>*/}
										{/*	))*/}
										{/*}*/}

										<Bar
											dataKey="percent"
											fill={(entry) => entry.color}
											radius={4}
										>
											<LabelList
												dataKey="value"
												position="top"
												fontSize={10}
											/>
										</Bar>
									</BarChart>
								);
							})}
							</div>
							{/*<BarChart data={mastery_chart_data}>*/}
							{/*	<ChartTooltip*/}
							{/*		content={<ChartTooltipContent*/}
							{/*			labelKey="class"*/}
							{/*			indicator="line"*/}
							{/*			formatter={(_value, name, item) => {*/}
							{/*				const originalValue = name === "m7_percent" ? item.payload.m7 : item.payload.m10;*/}
							{/*				const maxValue = name === "m7_percent" ? item.payload.m7_max : item.payload.m10_max;*/}

							{/*				return (*/}
							{/*					<div className="flex items-center justify-between gap-2">*/}
							{/*						<div className="flex items-center gap-2">*/}
							{/*							<div*/}
							{/*								className="h-2.5 w-1 shrink-0 rounded-[2px]"*/}
							{/*								style={{*/}
							{/*									backgroundColor: name === "m7_percent" ? "#2563eb" : "#60a5fa"*/}
							{/*								}}*/}
							{/*							/>*/}
							{/*							<span className="text-muted-foreground">*/}
							{/*								{name === "m7_percent" ? "Mastery 7" : "Mastery 10"}*/}
							{/*							</span>*/}
							{/*						</div>*/}
							{/*						<span className="font-mono font-medium tabular-nums text-foreground">*/}
							{/*							{originalValue}/{maxValue}*/}
							{/*						</span>*/}
							{/*					</div>*/}
							{/*				);*/}
							{/*			}}*/}
							{/*		/>}*/}
							{/*	/>*/}
							{/*	<XAxis dataKey="class" tickLine={false} tickMargin={10} axisLine={false} />*/}
							{/*	<YAxis hide domain={[0, 110]} />*/}

							{/*	{Object.keys(data.lcu_data).length > 0 && classes.map((class_name, index) => {*/}
							{/*		const m7_thresholds = Object.entries(data.lcu_data[m7_challenges[index]].thresholds).sort((a, b) => a[1].value - b[1].value);*/}
							{/*		const m10_thresholds = Object.entries(data.lcu_data[m10_challenges[index]].thresholds).sort((a, b) => a[1].value - b[1].value);*/}
							{/*		const next_threshold_m7 = m7_thresholds.find(([, value]) => value.value > data.lcu_data[m7_challenges[index]].currentValue) || m7_thresholds[m7_thresholds.length - 1];*/}
							{/*		const next_threshold_m10 = m10_thresholds.find(([, value]) => value.value > data.lcu_data[m10_challenges[index]].currentValue) || m10_thresholds[m10_thresholds.length - 1];*/}
							{/*		const next_threshold_m7_percent = next_threshold_m7[1].value / data.lcu_data[m7_challenges[index]].thresholds["MASTER"].value * 100;*/}
							{/*		return (*/}
							{/*			<>*/}
							{/*				/!*<ReferenceArea key={class_name} y1={next_threshold_m7_percent} y2={next_threshold_m7_percent + 0.1} stroke="#888" fill="#888" strokeDasharray="3 3" fillOpacity={0.1} x1={class_name} x2={class_name} ><Label value={next_threshold_m7[1].value} position="top" /></ReferenceArea>*!/*/}
							{/*				<ReferenceLine key={class_name} y={next_threshold_m7_percent} stroke="#888" strokeDasharray="3 3" x1={class_name} x2={class_name} ><Label value={next_threshold_m7[1].value} position="top" /></ReferenceLine>*/}
							{/*			</>);*/}
							{/*	})}*/}

							{/*	/!*{Object.keys(data.lcu_data).length > 0 && classes.map((c, i) => {*!/*/}
							{/*	/!*	console.log("c", c, "i", i);*!/*/}
							{/*	/!*	return Object.entries(data.lcu_data[m7_challenges[i]].thresholds).map(([key, value]) => {*!/*/}
							{/*	/!*		return (*!/*/}
							{/*	/!*			<ReferenceArea key={key+c} y1={value.value / data.lcu_data[m7_challenges[i]].thresholds["MASTER"].value * 100} y2={value.value / data.lcu_data[m7_challenges[i]].thresholds["MASTER"].value * 100 + 0.1} stroke="#888" fill="#888" strokeDasharray="3 3" fillOpacity={0.1} x1={c} x2={c} ><Label value={value.value} position="top" /></ReferenceArea>*!/*/}
							{/*	/!*		);*!/*/}
							{/*	/!*	});*!/*/}
							{/*	/!*})}*!/*/}

							{/*	<Bar dataKey="m7_percent" radius={4} fill="var(--color-m7)">*/}
							{/*		<LabelList dataKey="m7" position="top" offset={12} className="fill-foreground" fontSize={12} />*/}
							{/*	</Bar>*/}
							{/*	<Bar dataKey="m10_percent" radius={4} fill="var(--color-m10)" >*/}
							{/*		<LabelList dataKey="m10" position="top" offset={12} fontSize={12} />*/}
							{/*	</Bar>*/}
							{/*</BarChart>*/}
						</ChartContainer>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Summary Statistics</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Value</p>
								<p className="text-2xl font-bold">$12,345</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Average Performance</p>
								<p className="text-2xl font-bold">87%</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">Active Users</p>
								<p className="text-2xl font-bold">1,234</p>
							</div>
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

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="w-[200px] justify-between">
								Roles ({selected_roles.length})
								<ChevronDown className="h-4 w-4 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-[200px]">
							{classes.map(role => (
								<DropdownMenuCheckboxItem
									key={role}
									checked={selected_roles.includes(role.toLowerCase())}
									onCheckedChange={(checked) => {
										set_selected_roles(checked
											? [...selected_roles, role.toLowerCase()]
											: selected_roles.filter(r => r !== role.toLowerCase())
										);
									}}
								>
									{role}
								</DropdownMenuCheckboxItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={selected_roles.length === classes.length}
								onCheckedChange={(checked) => {
									set_selected_roles(checked ? classes.map(role => role.toLowerCase()) : []);
								}}
							>
								Select All
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>

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

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="w-[200px] justify-between">
								Types ({selectedTypes.length})
								<ChevronDown className="h-4 w-4 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-[200px]">
							<DropdownMenuCheckboxItem
								checked={selectedTypes.includes("type1")}
								onCheckedChange={(checked) => {
									setSelectedTypes(checked
										? [...selectedTypes, "type1"]
										: selectedTypes.filter(t => t !== "type1")
									);
								}}
							>
								Type 1
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={selectedTypes.includes("type2")}
								onCheckedChange={(checked) => {
									setSelectedTypes(checked
										? [...selectedTypes, "type2"]
										: selectedTypes.filter(t => t !== "type2")
									);
								}}
							>
								Type 2
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
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
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredData.map((item, i) => (
							<TableRow key={i}>
								<TableCell>{item.name}</TableCell>
								<TableCell>
									{item.roles.map((role, j) => (
										<Badge variant="outline" key={j}>{role}</Badge>
									))}
								</TableCell>
								<TableCell><Badge className={mastery_color(item.mastery_level)}>{item.mastery_level}</Badge> {item.mastery_points}</TableCell>
								<TableCell>{item.points_since_last_level}/{item.points_since_last_level + item.points_until_next_level}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}