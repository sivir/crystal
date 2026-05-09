import { useStaticData, useSessionData, default_mastery_data } from "@/data_context";
import type { APIChampSelectPlayer } from "@/data_context";
import { useEffect, useMemo, useState } from "react";
import { champion_name, lcu_get_request, lcu_post_request } from "@/lib/utils.ts";
import { ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID, ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID } from "@/lib/challenges";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, RefreshCw, X } from "lucide-react";
import { ChampionMasteryIcon } from "@/components/champion_mastery_icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Button } from "@/components/ui/button";

const ARENA_QUEUE_ID = 1700;
const ARAM_QUEUE_ID = 450;
const ARAM_MAYHEM_QUEUE_ID = 2400;
const ARURF_QUEUE_ID = 900;

type TableChampion = {
	row_id: string;
	champion_id: number;
	is_completed?: boolean;
	swap_action?: { type: "trade"; trade_id: number } | { type: "bench" };
};

export default function Lobby() {
	const { static_data, has_lcu_data } = useStaticData();
	const { session_data } = useSessionData();
	const [table_champions, set_table_champions] = useState<TableChampion[]>([]);
	const [hide_mastery_level, set_hide_mastery_level] = usePersistedState<number>('lobby.hide_mastery_level', 0);
	const [swapping_champion_id, set_swapping_champion_id] = useState<number | null>(null);

	const game_mode = useMemo(() => {
		return session_data.gameflow_session?.gameData?.queue?.id ?? -1;
	}, [session_data.gameflow_session]);

	const in_champ_select = session_data.gameflow_session?.phase == "ChampSelect";
	const supported_mode = game_mode == ARENA_QUEUE_ID || game_mode == ARAM_QUEUE_ID || game_mode == ARAM_MAYHEM_QUEUE_ID || game_mode == ARURF_QUEUE_ID;
	const can_swap_champions = game_mode == ARAM_QUEUE_ID || game_mode == ARAM_MAYHEM_QUEUE_ID || game_mode == ARURF_QUEUE_ID;

	useEffect(() => {
		if (!in_champ_select || !supported_mode) {
			set_table_champions([]);
			return;
		}
		if (game_mode == ARENA_QUEUE_ID) {
			const arena_completed = static_data.lcu_data[ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID]?.completedIds ?? [];
			lcu_get_request<number[]>("/lol-lobby-team-builder/champ-select/v1/crowd-favorte-champion-list") // typo is intentional
				.then((response) => {
					set_table_champions((response ?? []).map(champion_id => ({
						row_id: `arena-${champion_id}`,
						champion_id,
						is_completed: arena_completed.includes(champion_id)
					})));
				}).catch(error => console.error("Error fetching arena champion list:", error));
		}
		if (can_swap_champions) {
			let is_cancelled = false;
			const aram_completed = static_data.lcu_data[ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID]?.completedIds ?? [];

			if (is_cancelled) return;
			const trade_by_cell_id = new Map(session_data.champ_select_session?.trades.map(trade => [trade.cellId, trade.id]));
			const team_champions: TableChampion[] = session_data.champ_select_session?.myTeam.map((player: APIChampSelectPlayer) => {
				const trade_id = trade_by_cell_id.get(player.cellId);
				return {
					row_id: `team-${player.cellId}-${player.championId}`,
					champion_id: player.championId,
					is_completed: aram_completed.includes(player.championId),
					swap_action: trade_id ? { type: "trade" as const, trade_id } : undefined,
				};
			}) ?? [];
			const bench_champions: TableChampion[] = session_data.champ_select_session?.benchChampions.map((bench_champ, index) => ({
					row_id: `bench-${index}-${bench_champ.championId}`,
					champion_id: bench_champ.championId,
					is_completed: aram_completed.includes(bench_champ.championId),
					swap_action: { type: "bench" as const },
			})) ?? [];

			set_table_champions(team_champions.concat(bench_champions).filter(champion => champion.champion_id > 0));

			return () => {
				is_cancelled = true;
			};
		}
	}, [in_champ_select, supported_mode, can_swap_champions, game_mode, session_data.champ_select_session, static_data.lcu_data]);

	const sorted_table_champions = useMemo(() => {
		return [...table_champions]
			.filter(champ => {
				if (hide_mastery_level === 0) return true;
				const mastery = static_data.mastery_data.find(m => m.championId === champ.champion_id) ?? default_mastery_data;
				return mastery.championLevel < hide_mastery_level;
			})
			.sort((a, b) => {
				const mastery_a = static_data.mastery_data.find(m => m.championId === a.champion_id) ?? default_mastery_data;
				const mastery_b = static_data.mastery_data.find(m => m.championId === b.champion_id) ?? default_mastery_data;

				if (mastery_a.championLevel !== mastery_b.championLevel) {
					return mastery_b.championLevel - mastery_a.championLevel;
				}
				return mastery_b.championPoints - mastery_a.championPoints;
			});
	}, [table_champions, static_data.mastery_data, hide_mastery_level]);

	const swap_champion = async (champion: TableChampion) => {
		if (!champion.swap_action) return;
		set_swapping_champion_id(champion.champion_id);
		try {
			if (champion.swap_action.type === "trade") {
				await lcu_post_request(`/lol-champ-select/v1/session/champion-swaps/${champion.swap_action.trade_id}/request`, "");
			} else {
				await lcu_post_request(`/lol-champ-select/v1/session/bench/swap/${champion.champion_id}`, "");
			}
		} catch (error) {
			console.error(`Error swapping champion ${champion.champion_id}:`, error);
		} finally {
			set_swapping_champion_id(null);
		}
	};

	return (
		<div className="p-6 space-y-6">

			{!static_data.connected && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">Not connected to League client</p>
					</CardContent>
				</Card>
			)}

			{static_data.connected && !in_champ_select && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">Not in champion select for Arena/ARAM/ARURF</p>
					</CardContent>
				</Card>
			)}

			{static_data.connected && in_champ_select && supported_mode && (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<CardTitle>Champion Progress</CardTitle>
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Hide Mastery:</span>
							<Select
								value={hide_mastery_level.toString()}
								onValueChange={(value) => set_hide_mastery_level(parseInt(value))}
							>
								<SelectTrigger className="w-[80px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">None</SelectItem>
									<SelectItem value="5">5+</SelectItem>
									<SelectItem value="7">7+</SelectItem>
									<SelectItem value="10">10</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</CardHeader>
					<CardContent>
						{!has_lcu_data ? (
							<p className="text-muted-foreground">Loading challenge data...</p>
						) : sorted_table_champions.length === 0 ? (
							<p className="text-muted-foreground">
								{table_champions.length === 0 ? "No champions available" : "All champions filtered out"}
							</p>
						) : (
							<div className="space-y-2">
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Champion</TableHead>
												{game_mode != ARURF_QUEUE_ID && <TableHead className="text-center">Completed</TableHead>}
												{can_swap_champions && <TableHead className="text-center">Swap</TableHead>}
											</TableRow>
										</TableHeader>
										<TableBody>
										{sorted_table_champions.map((champion) => (
											<TableRow key={champion.row_id}>
												<TableCell>
													<div className="flex items-center gap-2">
													<ChampionMasteryIcon data={static_data.mastery_data.find((mastery) => mastery.championId == champion.champion_id) ?? default_mastery_data} className="w-8 h-8" />
													{champion_name(champion.champion_id, static_data.champion_map)}
													</div>
												</TableCell>
												{game_mode != ARURF_QUEUE_ID &&  <TableCell className="text-center">
												{champion.is_completed ? (
														<Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
													) : (
														<X className="h-5 w-5 text-red-600 dark:text-red-400 mx-auto" />
													)}
												</TableCell>}
												{can_swap_champions && (
													<TableCell className="text-center">
														<Button
															type="button"
															variant="ghost"
															size="icon"
															disabled={!champion.swap_action || swapping_champion_id === champion.champion_id}
															onClick={() => swap_champion(champion)}
															title={champion.swap_action ? "Swap to this champion" : "No swap available"}
														>
															<RefreshCw className={`h-4 w-4 ${swapping_champion_id === champion.champion_id ? "animate-spin" : ""}`} />
														</Button>
													</TableCell>
												)}
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}