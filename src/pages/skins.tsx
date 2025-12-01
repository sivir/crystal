import { useEffect, useMemo, useState } from "react";
import { useStaticData } from "@/data_context";
import { SortDirection } from "@/lib/utils";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Skin = {
	id: number;
	name: string;
	champion_id: number;
	is_base: boolean;
	owned: boolean;
	rarity: string;
	legacy: boolean;
	in_loot: boolean;
};

type ChampionSkinRow = {
	champion_id: number;
	champion_name: string;
	total_skins: number;
	owned_skins: Skin[];
	loot_skins: Skin[];
	unowned_skins: Skin[];
	is_expanded: boolean;
};

type SkinDataSummary = {
	total: {
		current: number;
		loot_contribution: number;
		requirement: number;
	},
	victorious: {
		current: number;
		loot_contribution: number;
		requirement: number;
	},
	legacy: {
		current: number;
		loot_contribution: number;
		requirement: number;
	},
	epic: {
		current: number;
		loot_contribution: number;
		requirement: number;
	},
	legendary: {
		current: number;
		loot_contribution: number;
		requirement: number;
	},
	mythic: {
		current: number;
		loot_contribution: number;
		requirement: number;
	},
	ultimate: {
		current: number;
		loot_contribution: number;
		requirement: number;
	},
	champions_5plus: {
		current: number;
		loot_contribution: number;
		requirement: number;
	},
	champions_15plus: {
		current: number;
		loot_contribution: number;
		requirement: number;
	},
};

type SortKey = "champion" | "total" | "owned" | "loot" | "owned_plus_loot" | "unowned";

export default function Skins() {
	const { static_data } = useStaticData();
	const [sort_key, set_sort_key] = useState<SortKey>("owned");
	const [sort_direction, set_sort_direction] = useState<SortDirection>("desc");
	const [table_data, set_table_data] = useState<ChampionSkinRow[]>([]);

	const all_skins = useMemo<Skin[]>(() => {
		const loot_skin_ids = new Set<number>();
		Object.values(static_data.loot_data).forEach(item => {
			loot_skin_ids.add(item.storeItemId);
		});

		return static_data.minimal_skins.map(skin => {
			const metadata = static_data.skin_map[skin.id];
			return {
				id: skin.id,
				name: metadata?.name || `Skin ${skin.id}`,
				champion_id: skin.championId,
				is_base: skin.isBase,
				owned: skin.ownership?.owned || false,
				rarity: metadata?.rarity || "kNoRarity",
				legacy: metadata?.isLegacy || false,
				in_loot: loot_skin_ids.has(skin.id),
			};
		});
	}, [static_data.minimal_skins, static_data.loot_data, static_data.skin_map]);

	const owned_skins = useMemo<Skin[]>(() => {
		return all_skins.filter(skin => skin.owned && !skin.is_base);
	}, [all_skins]);

	// all loot skins
	const all_loot_skins = useMemo<Skin[]>(() => {
		return all_skins.filter(skin => skin.in_loot && !skin.is_base);
	}, [all_skins]);

	// unowned loot skins
	const loot_skins = useMemo<Skin[]>(() => {
		return all_skins.filter(skin => skin.in_loot && !skin.owned && !skin.is_base);
	}, [all_skins]);

	const unowned_skins = useMemo<Skin[]>(() => {
		return all_skins.filter(skin => !skin.owned && !skin.is_base);
	}, [all_skins]);

	useEffect(() => {
		const new_data = Object.entries(static_data.champion_map).map(([champion_id_str, champion]) => {
			const champion_id = parseInt(champion_id_str);
			const champion_owned = owned_skins.filter(skin => skin.champion_id === champion_id);
			const champion_all_loot = all_loot_skins.filter(skin => skin.champion_id === champion_id);
			const champion_unowned = unowned_skins.filter(skin => skin.champion_id === champion_id);
			const champion_all = all_skins.filter(skin => skin.champion_id === champion_id && !skin.is_base);

			const existing_row = table_data.find(row => row.champion_id === champion_id);

			return {
				champion_id,
				champion_name: champion.name,
				total_skins: champion_all.length,
				owned_skins: champion_owned,
				loot_skins: champion_all_loot,
				unowned_skins: champion_unowned,
				is_expanded: existing_row?.is_expanded || false,
			};
		});
		set_table_data(new_data);
	}, [static_data.champion_map, all_skins, owned_skins, all_loot_skins, unowned_skins]);

	const sorted_data = useMemo(() => {
		return [...table_data].sort((a, b) => {
			let comparison = 0;

			switch (sort_key) {
				case "champion":
					comparison = a.champion_name.localeCompare(b.champion_name);
					break;
				case "total":
					comparison = a.total_skins - b.total_skins;
					break;
				case "owned":
					comparison = a.owned_skins.length - b.owned_skins.length;
					break;
				case "loot":
					comparison = a.loot_skins.length - b.loot_skins.length;
					break;
				case "unowned":
					comparison = a.unowned_skins.length - b.unowned_skins.length;
					break;
				case "owned_plus_loot":
					// Only count unowned loot skins
					const a_unowned_loot = a.loot_skins.filter(s => !s.owned).length;
					const b_unowned_loot = b.loot_skins.filter(s => !s.owned).length;
					const a_total = a.owned_skins.length + a_unowned_loot;
					const b_total = b.owned_skins.length + b_unowned_loot;
					comparison = a_total - b_total;
					break;
			}

			return sort_direction === "asc" ? comparison : -comparison;
		});
	}, [table_data, sort_key, sort_direction]);

	const handle_sort = (key: SortKey) => {
		if (sort_key === key) {
			set_sort_direction(sort_direction === "asc" ? "desc" : "asc");
		} else {
			set_sort_key(key);
			set_sort_direction("desc");
		}
	};

	const toggle_row = (championId: number) => {
		set_table_data(prev_data =>
			prev_data.map(row => row.champion_id === championId ? { ...row, is_expanded: !row.is_expanded } : row)
		);
	};

	const get_rarity_color = (rarity: string) => {
		switch (rarity) {
			case "kUltimate": return "text-orange-500 dark:text-orange-400";
			case "kMythic": return "text-purple-500 dark:text-purple-400";
			case "kLegendary": return "text-red-500 dark:text-red-400";
			case "kEpic": return "text-blue-500 dark:text-blue-400";
			default: return "text-gray-500 dark:text-gray-400";
		}
	};

	const skin_data_summary = useMemo<SkinDataSummary | null>(() => {
		if (Object.keys(static_data.skin_map).length === 0 || all_skins.length === 0) return null;

		const challenge_ids = {
			total: 510001,
			legacy: 510005,
			victorious: 510006,
			epic: 510010,
			legendary: 510009,
			mythic: 510008,
			ultimate: 510007,
			champions_5plus: 510004,
			champions_15plus: 510003,
		};

		const loot_contribution_total = loot_skins.length;
		const loot_contribution_legacy = loot_skins.filter(skin => skin.legacy).length;
		const loot_contribution_epic = loot_skins.filter(skin => skin.rarity === "kEpic").length;
		const loot_contribution_legendary = loot_skins.filter(skin => skin.rarity === "kLegendary").length;
		const loot_contribution_mythic = loot_skins.filter(skin => skin.rarity === "kMythic").length;
		const loot_contribution_ultimate = loot_skins.filter(skin => skin.rarity === "kUltimate").length;

		const champion_owned_counts = new Map<number, number>();
		owned_skins.forEach(skin => {
			const count = champion_owned_counts.get(skin.champion_id) || 0;
			champion_owned_counts.set(skin.champion_id, count + 1);
		});

		const champion_loot_counts = new Map<number, number>();
		loot_skins.forEach(skin => {
			const count = champion_loot_counts.get(skin.champion_id) || 0;
			champion_loot_counts.set(skin.champion_id, count + 1);
		});

		let champions_5plus_after_loot = 0;
		let max_champion_total = 0;

		Object.keys(static_data.champion_map).forEach(champion_id => {
			const owned = champion_owned_counts.get(parseInt(champion_id)) || 0;
			const loot = champion_loot_counts.get(parseInt(champion_id)) || 0;
			const total = owned + loot;

			if (total >= 5) {
				champions_5plus_after_loot++;
			}

			if (total > max_champion_total) {
				max_champion_total = total;
			}
		});

		const current_champions_5plus = static_data.lcu_data[challenge_ids.champions_5plus].currentValue;
		const loot_contribution_champions_5plus = champions_5plus_after_loot - current_champions_5plus;

		return {
			total: {
				current: static_data.lcu_data[challenge_ids.total].currentValue,
				loot_contribution: loot_contribution_total,
				requirement: static_data.lcu_data[challenge_ids.total].thresholds.MASTER.value,
			},
			victorious: {
				current: static_data.lcu_data[challenge_ids.victorious].currentValue,
				loot_contribution: 0,
				requirement: static_data.lcu_data[challenge_ids.victorious].thresholds.MASTER.value,
			},
			legacy: {
				current: static_data.lcu_data[challenge_ids.legacy].currentValue,
				loot_contribution: loot_contribution_legacy,
				requirement: static_data.lcu_data[challenge_ids.legacy].thresholds.MASTER.value,
			},
			epic: {
				current: static_data.lcu_data[challenge_ids.epic].currentValue,
				loot_contribution: loot_contribution_epic,
				requirement: static_data.lcu_data[challenge_ids.epic].thresholds.MASTER.value,
			},
			legendary: {
				current: static_data.lcu_data[challenge_ids.legendary].currentValue,
				loot_contribution: loot_contribution_legendary,
				requirement: static_data.lcu_data[challenge_ids.legendary].thresholds.MASTER.value,
			},
			mythic: {
				current: static_data.lcu_data[challenge_ids.mythic].currentValue,
				loot_contribution: loot_contribution_mythic,
				requirement: static_data.lcu_data[challenge_ids.mythic].thresholds.MASTER.value,
			},
			ultimate: {
				current: static_data.lcu_data[challenge_ids.ultimate].currentValue,
				loot_contribution: loot_contribution_ultimate,
				requirement: static_data.lcu_data[challenge_ids.ultimate].thresholds.MASTER.value,
			},
			champions_5plus: {
				current: current_champions_5plus,
				loot_contribution: loot_contribution_champions_5plus,
				requirement: static_data.lcu_data[challenge_ids.champions_5plus].thresholds.MASTER.value,
			},
			champions_15plus: {
				current: static_data.lcu_data[challenge_ids.champions_15plus].currentValue,
				loot_contribution: max_champion_total,
				requirement: static_data.lcu_data[challenge_ids.champions_15plus].thresholds.MASTER.value,
			},
		};
	}, [static_data.skin_map, all_skins, owned_skins, loot_skins, static_data.lcu_data]);

	const SortIcon = ({ column_key }: { column_key: SortKey }) => {
		if (sort_key !== column_key) return null;
		return sort_direction === "asc" ? <ArrowUp className="inline w-4 h-4" /> : <ArrowDown className="inline w-4 h-4" />;
	};

	if (static_data.minimal_skins.length === 0) {
		return (
			<div className="p-6">
				<p>Loading skins data...</p>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{skin_data_summary && (
				<Card>
					<CardHeader>
						<CardTitle>Skin Challenge Progress</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">Total Skins</p>
							<p className="text-lg font-semibold">
								{skin_data_summary.total.current}
								{skin_data_summary.total.loot_contribution > 0 && (
									<span className="text-green-600 dark:text-green-400"> +{skin_data_summary.total.loot_contribution}</span>
								)}
								<span className="text-muted-foreground"> = {skin_data_summary.total.current + skin_data_summary.total.loot_contribution}</span>
								<span className="text-muted-foreground"> / {skin_data_summary.total.requirement}</span>
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">Champions (5+)</p>
							<p className="text-lg font-semibold">
								{skin_data_summary.champions_5plus.current}
								{skin_data_summary.champions_5plus.loot_contribution > 0 && (
									<span className="text-green-600 dark:text-green-400"> +{skin_data_summary.champions_5plus.loot_contribution}</span>
								)}
								<span className="text-muted-foreground"> = {skin_data_summary.champions_5plus.current + skin_data_summary.champions_5plus.loot_contribution}</span>
								<span className="text-muted-foreground"> / {skin_data_summary.champions_5plus.requirement}</span>
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">Champions (15+)</p>
							<p className="text-lg font-semibold">
								{skin_data_summary.champions_15plus.current}
								<span className="text-muted-foreground"> (Max: {skin_data_summary.champions_15plus.loot_contribution})</span>
								<span className="text-muted-foreground"> / {skin_data_summary.champions_15plus.requirement}</span>
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
						<div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
							<p className="text-xs text-muted-foreground mb-1">Ultimate</p>
							<p className="text-sm font-semibold text-orange-500">
								{skin_data_summary.ultimate.current}
								{skin_data_summary.ultimate.loot_contribution > 0 && (
										<span className="text-green-600 dark:text-green-400"> +{skin_data_summary.ultimate.loot_contribution}</span>
									)}
									<span className="text-muted-foreground"> = {skin_data_summary.ultimate.current + skin_data_summary.ultimate.loot_contribution}</span>
									<span className="text-muted-foreground"> / {skin_data_summary.ultimate.requirement}</span>
								</p>
							</div>
							<div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
								<p className="text-xs text-muted-foreground mb-1">Mythic</p>
								<p className="text-sm font-semibold text-purple-500">
									{skin_data_summary.mythic.current}
									{skin_data_summary.mythic.loot_contribution > 0 && (
										<span className="text-green-600 dark:text-green-400"> +{skin_data_summary.mythic.loot_contribution}</span>
									)}
									<span className="text-muted-foreground"> = {skin_data_summary.mythic.current + skin_data_summary.mythic.loot_contribution}</span>
									<span className="text-muted-foreground"> / {skin_data_summary.mythic.requirement}</span>
								</p>
							</div>
							<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
								<p className="text-xs text-muted-foreground mb-1">Legendary</p>
								<p className="text-sm font-semibold text-red-500">
									{skin_data_summary.legendary.current}
									{skin_data_summary.legendary.loot_contribution > 0 && (
										<span className="text-green-600 dark:text-green-400"> +{skin_data_summary.legendary.loot_contribution}</span>
									)}
									<span className="text-muted-foreground"> = {skin_data_summary.legendary.current + skin_data_summary.legendary.loot_contribution}</span>
									<span className="text-muted-foreground"> / {skin_data_summary.legendary.requirement}</span>
								</p>
							</div>
							<div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
								<p className="text-xs text-muted-foreground mb-1">Epic</p>
								<p className="text-sm font-semibold text-blue-500">
									{skin_data_summary.epic.current}
									{skin_data_summary.epic.loot_contribution > 0 && (
										<span className="text-green-600 dark:text-green-400"> +{skin_data_summary.epic.loot_contribution}</span>
									)}
									<span className="text-muted-foreground"> = {skin_data_summary.epic.current + skin_data_summary.epic.loot_contribution}</span>
									<span className="text-muted-foreground"> / {skin_data_summary.epic.requirement}</span>
								</p>
							</div>
							<div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
								<p className="text-xs text-muted-foreground mb-1">Legacy</p>
								<p className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">
									{skin_data_summary.legacy.current}
									{skin_data_summary.legacy.loot_contribution > 0 && (
										<span className="text-green-600 dark:text-green-400"> +{skin_data_summary.legacy.loot_contribution}</span>
									)}
									<span className="text-muted-foreground"> = {skin_data_summary.legacy.current + skin_data_summary.legacy.loot_contribution}</span>
									<span className="text-muted-foreground"> / {skin_data_summary.legacy.requirement}</span>
								</p>
							</div>
							<div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
								<p className="text-xs text-muted-foreground mb-1">Victorious</p>
								<p className="text-sm font-semibold text-green-600 dark:text-green-500">
									{skin_data_summary.victorious.current}
									<span className="text-muted-foreground"> / {skin_data_summary.victorious.requirement}</span>
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handle_sort("champion")}>
								Champion <SortIcon column_key="champion" />
							</TableHead>
							<TableHead className="cursor-pointer hover:bg-muted/50 text-center" onClick={() => handle_sort("total")}>
								Total Skins <SortIcon column_key="total" />
							</TableHead>
							<TableHead className="cursor-pointer hover:bg-muted/50 text-center" onClick={() => handle_sort("owned")}>
								Owned <SortIcon column_key="owned" />
							</TableHead>
							<TableHead className="cursor-pointer hover:bg-muted/50 text-center" onClick={() => handle_sort("loot")}>
								In Loot <SortIcon column_key="loot" />
							</TableHead>
							<TableHead className="cursor-pointer hover:bg-muted/50 text-center" onClick={() => handle_sort("owned_plus_loot")}>
								Owned + Loot <SortIcon column_key="owned_plus_loot" />
							</TableHead>
							<TableHead className="cursor-pointer hover:bg-muted/50 text-center" onClick={() => handle_sort("unowned")}>
								Unowned <SortIcon column_key="unowned" />
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sorted_data.map((row) => {
							const is_highlighted = row.total_skins >= 15;

							const unique_loot_skins = new Set(row.loot_skins.map(l => l.id));
							const unowned_after_craft = row.unowned_skins.filter(skin => !unique_loot_skins.has(skin.id)).length;

							return (
								<>
									<TableRow
										key={row.champion_id}
										className={is_highlighted ? "bg-yellow-500/10 hover:bg-yellow-500/20" : ""}
									>
										<TableCell>
											<div className="flex items-center gap-2">
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6 p-0"
													onClick={() => toggle_row(row.champion_id)}
												>
													{row.is_expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
												</Button>
												<img
													src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${row.champion_id}.png`}
													alt={row.champion_name}
													className="w-8 h-8 rounded"
												/>
												<span className="font-medium">{row.champion_name}</span>
											</div>
										</TableCell>
										<TableCell className="text-center">
											<Badge variant={is_highlighted ? "default" : "secondary"}>
												{row.total_skins}
											</Badge>
										</TableCell>
										<TableCell className="text-center">
											<span className="font-semibold">
												{row.owned_skins.length}
											</span>
										</TableCell>
										<TableCell className="text-center">
											<span className="font-semibold text-green-600 dark:text-green-400">
												{row.loot_skins.length}
												{(() => {
													const owned_loot_count = row.loot_skins.filter(skin => skin.owned).length;
													return owned_loot_count > 0 ? (
														<span className="text-xs text-muted-foreground ml-1">
															({owned_loot_count} owned)
														</span>
													) : null;
												})()}
											</span>
										</TableCell>
										<TableCell className="text-center">
											<span className="font-semibold">
												{row.owned_skins.length + row.loot_skins.filter(s => !s.owned).length}
											</span>
										</TableCell>
										<TableCell className="text-center">
											<span className="text-muted-foreground">
												{row.unowned_skins.length}
												{unique_loot_skins.size > 0 && (
													<span className="text-xs ml-1">
														({unowned_after_craft})
													</span>
												)}
											</span>
										</TableCell>
									</TableRow>
									{row.is_expanded && (
										<TableRow key={`${row.champion_id}-details`}>
											<TableCell colSpan={6} className="bg-muted/30 p-6">
												<div className="grid grid-cols-3 gap-6">
													<div>
														<h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">
															Owned Skins ({row.owned_skins.length})
														</h4>
														<div className="space-y-2 max-h-96 overflow-y-auto">
															{row.owned_skins.map(skin => (
																<div key={skin.id} className="flex items-center justify-between text-sm p-2 rounded bg-background/50">
																	<span>{skin.name}</span>
																	<div className="flex gap-2 items-center">
																		<Badge variant="outline" className={get_rarity_color(skin.rarity)}>
																			{skin.rarity}
																		</Badge>
																		{skin.legacy && (
																			<Badge variant="secondary" className="text-xs">Legacy</Badge>
																		)}
																	</div>
																</div>
															))}
														</div>
													</div>
													<div>
														<h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">
															In Loot ({row.loot_skins.length})
														</h4>
														<div className="space-y-2 max-h-96 overflow-y-auto">
															{row.loot_skins.map(skin => (
																<div key={skin.id} className={`flex items-center justify-between text-sm p-2 rounded bg-background/50 ${skin.owned ? 'opacity-60' : ''}`}>
																	<span className={skin.owned ? 'line-through' : ''}>{skin.name}</span>
																	<div className="flex gap-2 items-center">
																		<Badge variant="outline" className={get_rarity_color(skin.rarity)}>
																			{skin.rarity}
																		</Badge>
																		{skin.legacy && (
																			<Badge variant="secondary" className="text-xs">Legacy</Badge>
																		)}
																		{skin.owned && (
																			<Badge variant="destructive" className="text-xs">Owned</Badge>
																		)}
																	</div>
																</div>
															))}
														</div>
													</div>
													<div>
														<h4 className="font-semibold mb-3 text-muted-foreground">
															Unowned ({row.unowned_skins.length})
														</h4>
														<div className="space-y-2 max-h-96 overflow-y-auto">
															{row.unowned_skins.map(skin => (
																<div key={skin.id} className="flex items-center justify-between text-sm p-2 rounded bg-background/50">
																	<span>{skin.name}</span>
																	<div className="flex gap-2 items-center">
																		<Badge variant="outline" className={get_rarity_color(skin.rarity)}>
																			{skin.rarity}
																		</Badge>
																		{skin.legacy && (
																			<Badge variant="secondary" className="text-xs">Legacy</Badge>
																		)}
																	</div>
																</div>
															))}
														</div>
													</div>
												</div>
											</TableCell>
										</TableRow>
									)}
								</>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}