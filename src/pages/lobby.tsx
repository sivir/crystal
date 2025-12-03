import { useStaticData, useSessionData, APIChampSelectPlayer } from "@/data_context";
import { useEffect, useMemo, useState } from "react";
import { champion_name, lcu_get_request } from "@/lib/utils.ts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { ChampionMasteryIcon } from "@/components/champion_mastery_icon";

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

	const game_mode = useMemo(() => {
		return session_data.gameflow_session?.gameData?.queue?.id ?? -1;
	}, [session_data.gameflow_session]);

	const in_champ_select = session_data.gameflow_session?.phase == "ChampSelect";
	const supported_mode = game_mode == ARENA_QUEUE_ID || game_mode == ARAM_QUEUE_ID || game_mode == ARAM_MAYHEM_QUEUE_ID;

	useEffect(() => {
		if (!in_champ_select || !supported_mode) {
			set_table_champions([]);
			return;
		}
		if (game_mode == ARENA_QUEUE_ID) {
			lcu_get_request<number[]>("/lol-lobby-team-builder/champ-select/v1/crowd-favorte-champion-list").then((response) => { // typo is intentional
				set_table_champions(response.map(champion_id => ({
					champion_id,
					is_completed: static_data.lcu_data[ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID].completedIds.includes(champion_id)
				})));
			});
		}
		if (game_mode == ARAM_QUEUE_ID || game_mode == ARAM_MAYHEM_QUEUE_ID) {
			set_table_champions(session_data.champ_select_session?.myTeam.map((player: APIChampSelectPlayer) => ({
				champion_id: player.championId,
				is_completed: static_data.lcu_data[ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID].completedIds.includes(player.championId)
			})).concat(session_data.champ_select_session?.benchChampions.map((benchChamp: any) => ({
				champion_id: benchChamp.championId,
				is_completed: static_data.lcu_data[ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID].completedIds.includes(benchChamp.championId)
			}))).filter(champion => champion.champion_id > 0) ?? []);
		}
	}, [in_champ_select, game_mode, session_data.champ_select_session]);

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Lobby</h1>

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
					<CardHeader>
						<CardTitle>{game_mode == ARENA_QUEUE_ID ? "Arena" : "ARAM"} Champion Progress</CardTitle>
					</CardHeader>
					<CardContent>
						{!has_lcu_data ? (
							<p className="text-muted-foreground">Loading challenge data...</p>
						) : !has_lcu_data ? (
							<p className="text-muted-foreground">Challenge data not available</p>
						) : table_champions.length === 0 ? (
							<p className="text-muted-foreground">
								Loading champions...
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
											{table_champions.map(({ champion_id, is_completed }) => (
												<TableRow key={champion_id}>
													<TableCell>
														<div className="flex items-center gap-2">
															<ChampionMasteryIcon data={static_data.mastery_data.find((mastery) => mastery.championId == champion_id)} className="w-8 h-8" />
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