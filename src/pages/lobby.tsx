import { useStaticData, useSessionData, APIChampSelectPlayer, default_mastery_data } from "@/data_context";
import { useEffect, useMemo, useState } from "react";
import { champion_name, lcu_get_request } from "@/lib/utils.ts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { ChampionMasteryIcon } from "@/components/champion_mastery_icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePersistedState } from "@/hooks/use-persisted-state";

const ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID = 602002; // arena (win on all champs)
const ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID = 101301; // aram (s- or better on all champs)

const ARENA_QUEUE_ID = 1700;
const ARAM_QUEUE_ID = 450;
const ARAM_MAYHEM_QUEUE_ID = 2400;

type TableChampion = {
	champion_id: number;
	is_completed?: boolean;
};

export default function Lobby() {
	const { static_data, has_lcu_data } = useStaticData();
	const { session_data } = useSessionData();
	const [table_champions, set_table_champions] = useState<TableChampion[]>([]);
	const [hide_mastery_level, set_hide_mastery_level] = usePersistedState<number>('lobby.hide_mastery_level', 0);
	const [is_loading, set_is_loading] = useState(false);

	const game_mode = useMemo(() => {
		return session_data.gameflow_session?.gameData?.queue?.id ?? -1;
	}, [session_data.gameflow_session]);

	const in_champ_select = session_data.gameflow_session?.phase == "ChampSelect";
	const supported_mode = game_mode == ARENA_QUEUE_ID || game_mode == ARAM_QUEUE_ID || game_mode == ARAM_MAYHEM_QUEUE_ID;

	useEffect(() => {
		if (!in_champ_select || !supported_mode) {
			set_table_champions([]);
			set_is_loading(false);
			return;
		}
		if (game_mode == ARENA_QUEUE_ID) {
			set_is_loading(true);
			lcu_get_request<number[]>("/lol-lobby-team-builder/champ-select/v1/crowd-favorte-champion-list").then((response) => { // typo is intentional
				set_table_champions(response.map(champion_id => ({
					champion_id,
					is_completed: static_data.lcu_data[ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID].completedIds.includes(champion_id)
				})));
				set_is_loading(false);
			});
		}
		if (game_mode == ARAM_QUEUE_ID || game_mode == ARAM_MAYHEM_QUEUE_ID) {
			const champions = session_data.champ_select_session?.myTeam.map((player: APIChampSelectPlayer) => ({
				champion_id: player.championId,
				is_completed: static_data.lcu_data[ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID].completedIds.includes(player.championId)
			})).concat(session_data.champ_select_session?.benchChampions.map((benchChamp: any) => ({
				champion_id: benchChamp.championId,
				is_completed: static_data.lcu_data[ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID].completedIds.includes(benchChamp.championId)
			}))).filter(champion => champion.champion_id > 0) ?? [];
			set_table_champions(champions);
			set_is_loading(false);
		}
	}, [in_champ_select, game_mode, session_data.champ_select_session]);

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

				// Sort by mastery level first (descending)
				if (mastery_a.championLevel !== mastery_b.championLevel) {
					return mastery_b.championLevel - mastery_a.championLevel;
				}
				// Then by mastery points (descending)
				return mastery_b.championPoints - mastery_a.championPoints;
			});
	}, [table_champions, static_data.mastery_data, hide_mastery_level]);

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Lobby</h1>

			<>gameflow phase: {session_data.gameflow_session?.phase}, queue id: {session_data.gameflow_session?.gameData?.queue?.id}, has riot data: {static_data.riot_data ? "true" : "false"}</>

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
						<p className="text-muted-foreground">Not in champion select for Arena or ARAM</p>
					</CardContent>
				</Card>
			)}

			{static_data.connected && in_champ_select && supported_mode && (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<CardTitle>{game_mode == ARENA_QUEUE_ID ? "Arena" : "ARAM"} Champion Progress</CardTitle>
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Hide M</span>
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
						) : is_loading ? (
							<p className="text-muted-foreground">Loading champions...</p>
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
												{game_mode != ARAM_MAYHEM_QUEUE_ID && <TableHead className="text-center">Completed</TableHead>}
											</TableRow>
										</TableHeader>
										<TableBody>
											{sorted_table_champions.map(({ champion_id, is_completed }) => (
												<TableRow key={champion_id}>
													<TableCell>
														<div className="flex items-center gap-2">
															<ChampionMasteryIcon data={static_data.mastery_data.find((mastery) => mastery.championId == champion_id) ?? default_mastery_data} className="w-8 h-8" />
															{champion_name(champion_id, static_data.champion_map)}
														</div>
													</TableCell>
													{game_mode != ARAM_MAYHEM_QUEUE_ID &&  <TableCell className="text-center">
														{is_completed ? (
															<Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
														) : (
															<X className="h-5 w-5 text-red-600 dark:text-red-400 mx-auto" />
														)}
													</TableCell>}
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