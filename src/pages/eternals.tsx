import { Fragment, useEffect, useMemo, useState } from "react";
import { useStaticData } from "@/data_context";
import { SortDirection, classes } from "@/lib/utils";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { FilterDropdown } from "@/components/filter_dropdown";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLoading } from "@/lib/loading_state.ts";

type EternalProgress = {
	item_id: number;
	name: string;
	description: string;
	current_value: number;
	target_value: number;
	formatted_value: string;
	is_retired: boolean;
	series_name: string;
};

type SeriesProgress = {
	series_name: string;
	eternals: EternalProgress[];
	progress_percent: number;
	stones_owned: number;
};

type ChampionEternalsRow = {
	champion_id: number;
	champion_name: string;
	roles: string[];
	series: SeriesProgress[];
	total_progress: number;
	is_expanded: boolean;
};

type SortKey = "champion" | "starter" | "series1" | "series2";

export default function Eternals() {
	const { static_data } = useStaticData();
	const { is_loading, loading_progress } = useLoading();
	const [table_data, set_table_data] = useState<ChampionEternalsRow[]>([]);
	const [sort_key, set_sort_key] = useState<SortKey>("starter");
	const [sort_direction, set_sort_direction] = useState<SortDirection>("desc");
	const [search, set_search] = useState<string>("");
	const [selected_roles, set_selected_roles] = useState<string[]>([]);
	const [hide_completed, set_hide_completed] = useState<boolean>(false);

	useEffect(() => {
		const new_table_data = Object.entries(static_data.champion_map).map(([champion_id_str, champion]) => {
			const champion_id = parseInt(champion_id_str);
			const eternals_series = static_data.eternals_map.get(champion_id);

			if (!eternals_series || eternals_series.length === 0) {
				return {
					champion_id,
					champion_name: champion.name,
					roles: champion.roles,
					series: [],
					total_progress: 0,
					is_expanded: false,
				};
			}

			const series_list: SeriesProgress[] = [];
			let total_current = 0;
			let total_target = 0;

			eternals_series.forEach(series => {
				const metadata_set = static_data.statstones_map[series.itemId.toString()];

				const eternals: EternalProgress[] = [];
				let series_progress = 0;

				series.statstones.forEach((statstone, index) => {
					const metadata = metadata_set?.statstones[index];

					// target value is sum of first 5 milestones
					const target_value = metadata?.milestones.slice(0, 5).reduce((sum, val) => sum + val, 0) || 0;
					const current_value = statstone.playerRecord?.value || 0;

					series_progress += Math.min((current_value / target_value) * 100, 100);
					total_current += current_value;
					total_target += target_value;

					eternals.push({
						item_id: metadata?.itemId || 0,
						name: statstone.name,
						description: statstone.description,
						current_value,
						target_value,
						formatted_value: statstone.formattedValue,
						is_retired: statstone.isRetired,
						series_name: series.name,
					});
				});

				series_list.push({
					series_name: series.name,
					eternals,
					progress_percent: series_progress / series.statstones.length,
					stones_owned: series.stonesOwned,
				});
			});

			const total_progress = total_target > 0 ? Math.min((total_current / total_target) * 100, 100) : 0;

			// preserve expanded state if it exists
			const existing_row = table_data.find(row => row.champion_id === champion_id);

			return {
				champion_id,
				champion_name: champion.name,
				roles: champion.roles,
				series: series_list,
				total_progress,
				is_expanded: existing_row?.is_expanded || false,
			};
		});

		set_table_data(new_table_data);
	}, [static_data.champion_map, static_data.eternals_map, static_data.statstones_map]);

	const sorted_data = useMemo(() => {
		return [...table_data].sort((a, b) => {
			let comparison = 0;

			switch (sort_key) {
				case "champion":
					comparison = a.champion_name.localeCompare(b.champion_name);
					break;
				case "starter":
					const a_starter = a.series.find(s => !s.series_name.toLowerCase().includes("1") && !s.series_name.toLowerCase().includes("2"))?.progress_percent || 0;
					const b_starter = b.series.find(s => !s.series_name.toLowerCase().includes("1") && !s.series_name.toLowerCase().includes("2"))?.progress_percent || 0;
					comparison = a_starter - b_starter;
					break;
				case "series1":
					const a_series1 = a.series.find(s => s.series_name.toLowerCase().includes("1"))?.progress_percent || 0;
					const b_series1 = b.series.find(s => s.series_name.toLowerCase().includes("1"))?.progress_percent || 0;
					comparison = a_series1 - b_series1;
					break;
				case "series2":
					const a_series2 = a.series.find(s => s.series_name.toLowerCase().includes("2"))?.progress_percent || 0;
					const b_series2 = b.series.find(s => s.series_name.toLowerCase().includes("2"))?.progress_percent || 0;
					comparison = a_series2 - b_series2;
					break;
			}

			return sort_direction === "asc" ? comparison : -comparison;
		});
	}, [table_data, sort_key, sort_direction]);

	const filtered_data = useMemo(() => {
		return sorted_data.filter(row => {
			const role_match = selected_roles.length === 0 || row.roles.some(role => selected_roles.map(x => x.toLowerCase()).includes(role));
			const name_match = search === "" || row.champion_name.toLowerCase().includes(search.toLowerCase());
			const completed_match = !hide_completed || !row.series.some(s => s.progress_percent >= 100);
			return role_match && name_match && completed_match;
		});
	}, [sorted_data, selected_roles, search, hide_completed]);

	const handle_sort = (key: SortKey) => {
		if (sort_key === key) {
			set_sort_direction(sort_direction === "asc" ? "desc" : "asc");
		} else {
			set_sort_key(key);
			set_sort_direction("desc");
		}
	};

	const toggle_row = (champion_id: number) => {
		set_table_data(prev_data =>
			prev_data.map(row =>
				row.champion_id === champion_id ? { ...row, is_expanded: !row.is_expanded } : row
			)
		);
	};

	const SortIcon = ({ column_key }: { column_key: SortKey }) => {
		if (sort_key !== column_key) return null;
		return sort_direction === "asc" ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />;
	};

	if (is_loading && static_data.eternals_map.size === 0) {
		return (
			<div className="p-6 space-y-4">
				<Progress value={loading_progress} />
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	function render_external_series(series: SeriesProgress) {
		if (!series) return <>Eternal series not found</>;
		return (
			<div className="space-y-2">
				<div className="flex items-center gap-2 mb-2">
					<h3 className="font-semibold text-sm">{series.series_name}</h3>
					<Badge variant="outline" className="text-xs">
						{series.progress_percent.toFixed(1)}%
					</Badge>
				</div>
				{series.eternals.map((eternal, eternal_idx) => (
					<div key={eternal_idx} className="p-2 rounded bg-background space-y-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="font-medium text-sm">{eternal.name}</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>{eternal.description}</p>
							</TooltipContent>
						</Tooltip>
						<Progress value={Math.min((eternal.current_value / eternal.target_value) * 100, 100)} className="w-full" />
						<div className="flex items-center justify-between">
							<span className="text-xs text-muted-foreground">
								{eternal.formatted_value} ({eternal.current_value.toLocaleString()}) / {eternal.target_value.toLocaleString()}
							</span>
							{eternal.is_retired && (
								<Badge variant="outline" className="text-xs">Retired</Badge>
							)}
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Eternals Progress</h1>
			</div>

			<div className="flex items-center gap-4 flex-wrap">
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

				<div className="flex items-center gap-2">
					<Checkbox
						id="hide-completed"
						checked={hide_completed}
						onCheckedChange={(checked) => set_hide_completed(checked as boolean)}
					/>
					<Label htmlFor="hide-completed" className="text-sm cursor-pointer">
						Hide champions with at least one completed series
					</Label>
				</div>
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12"></TableHead>
							<TableHead
								className="cursor-pointer hover:bg-muted/50"
								onClick={() => handle_sort("champion")}
							>
								Champion <SortIcon column_key="champion" />
							</TableHead>
							<TableHead>Roles</TableHead>
							<TableHead
								className="cursor-pointer hover:bg-muted/50"
								onClick={() => handle_sort("starter")}
							>
								Starter Series <SortIcon column_key="starter" />
							</TableHead>
							<TableHead
								className="cursor-pointer hover:bg-muted/50"
								onClick={() => handle_sort("series1")}
							>
								Series 1 <SortIcon column_key="series1" />
							</TableHead>
							<TableHead
								className="cursor-pointer hover:bg-muted/50"
								onClick={() => handle_sort("series2")}
							>
								Series 2 <SortIcon column_key="series2" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered_data.map((row) => {
							const starter_series = row.series.find(s => s.series_name.toLowerCase().includes("starter"));
							const series1 = row.series.find(s => s.series_name.toLowerCase().includes("1"));
							const series2 = row.series.find(s => s.series_name.toLowerCase().includes("2"));

							return (
								<Fragment key={row.champion_id}>
									<TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggle_row(row.champion_id)}>
										<TableCell>
											{row.is_expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<img
													src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${row.champion_id}.png`}
													alt={row.champion_name}
													className="w-8 h-8 rounded"
												/>
												<span className="font-medium">{row.champion_name}</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex gap-1 flex-wrap">
												{row.roles.map((role, idx) => (
													<Badge key={idx} variant="outline">{role}</Badge>
												))}
											</div>
										</TableCell>
										<TableCell>
											{starter_series ? (
												starter_series.stones_owned === 0 ? (
													<div className="flex items-center gap-2">
														<span className="text-sm text-muted-foreground italic">Not Owned</span>
													</div>
												) : (
													<div className="flex items-center gap-2">
														<Progress value={starter_series.progress_percent} className="w-32" />
														<span className="text-sm text-muted-foreground w-12 text-right">{starter_series.progress_percent.toFixed(1)}%</span>
													</div>
												)
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{series1 ? (
												series1.stones_owned === 0 ? (
													<div className="flex items-center gap-2">
														<span className="text-sm text-muted-foreground italic">Not Owned</span>
													</div>
												) : (
													<div className="flex items-center gap-2">
														<Progress value={series1.progress_percent} className="w-32" />
														<span className="text-sm text-muted-foreground w-12 text-right">{series1.progress_percent.toFixed(1)}%</span>
													</div>
												)
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</TableCell>
										<TableCell>
											{series2 ? (
												series2.stones_owned === 0 ? (
													<div className="flex items-center gap-2">
														<span className="text-sm text-muted-foreground italic">Not Owned</span>
													</div>
												) : (
													<div className="flex items-center gap-2">
														<Progress value={series2.progress_percent} className="w-32" />
														<span className="text-sm text-muted-foreground w-12 text-right">{series2.progress_percent.toFixed(1)}%</span>
													</div>
												)
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</TableCell>
									</TableRow>
									{row.is_expanded && (
										<TableRow key={`${row.champion_id}-details`}>
											<TableCell colSpan={6} className="bg-muted/20 p-0">
												<div className="grid grid-cols-3 gap-4 p-4">
													{starter_series && render_external_series(starter_series)}
													{series1 && render_external_series(series1)}
													{series2 && render_external_series(series2)}
												</div>
											</TableCell>
										</TableRow>
									)}
								</Fragment>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

