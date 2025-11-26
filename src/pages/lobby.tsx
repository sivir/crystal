import { useStaticData, useSessionData, APIChampSelectPlayer } from "@/data_context";
import { useEffect, useMemo, useState } from "react";
import { champion_name, lcu_get_request } from "@/lib/utils.ts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, X } from "lucide-react";

const ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID = 602002; // arena (win on all champs)
const ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID = 101301; // aram (s- or better on all champs)

type CrowdFavoriteChampion = {
	champion_id: number;
	is_completed: boolean;
};

type ChampionMasteryDisplay = {
	champion_id: number;
	mastery_level: number;
	mastery_points: number;
	points_since_last_level: number;
	points_until_next_level: number;
	is_completed?: boolean; // For challenge completion
};

// Mastery level colors (same as champions.tsx)
const mastery_colors: Record<number, string> = {
	10: "bg-orange-500 hover:bg-orange-600 text-white border-transparent",
	9: "bg-purple-500 hover:bg-purple-600 text-white border-transparent",
	8: "bg-pink-500 hover:bg-pink-600 text-white border-transparent",
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

const queue_ids: Record<number, string> = {
	1700: "arena",
	450: "aram",
	2400: "aram-mayhem"
}

export default function Lobby() {
	const { static_data, has_lcu_data } = useStaticData();
	const { session_data } = useSessionData();
	const [crowd_favorites, set_crowd_favorites] = useState<number[]>([]);

	const game_mode = useMemo(() => {
		if (!session_data.gameflow_session) {
			return null;
		}
		const queue_id = session_data.gameflow_session.gameData?.queue?.id ?? 450;
		return queue_ids[queue_id] ?? null;
	}, [session_data.gameflow_session]);

	const arena_champ_select = game_mode === "arena" && session_data.gameflow_session?.phase == "ChampSelect";
	const isInAramChampSelect = (game_mode === "aram" || game_mode === "aram-mayhem") && session_data.gameflow_session?.phase == "ChampSelect";
	const isAramMayhem = game_mode === "aram-mayhem";

	useEffect(() => {
		if (arena_champ_select && static_data.connected) {
			lcu_get_request<number[]>("/lol-lobby-team-builder/champ-select/v1/crowd-favorte-champion-list").then((response) => { // typo is intentional
				console.log("Crowd favorite champions:", response);
				set_crowd_favorites(response);
			});
		} else {
			set_crowd_favorites([]);
		}
	}, [arena_champ_select, static_data.connected]);

	// Get ARAM champions (team + bench)
	const aram_champions = useMemo<ChampionMasteryDisplay[]>(() => {
		if (!isInAramChampSelect || !session_data.champ_select_session) return [];

		const session = session_data.champ_select_session;
		const champion_ids = session.myTeam.map((player: APIChampSelectPlayer) => player.championId).concat(session.benchChampions.map((benchChamp: any) => benchChamp.championId)).filter(id => id > 0);

		const aramChallenge = !isAramMayhem ? static_data.lcu_data[ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID] : null;

		return champion_ids.map(champion_id => {
			const masteryData = static_data.mastery_data.find(m => m.championId === champion_id);
			return {
				champion_id,
				mastery_level: masteryData?.championLevel || 0,
				mastery_points: masteryData?.championPoints || 0,
				points_since_last_level: masteryData?.championPointsSinceLastLevel || 0,
				points_until_next_level: masteryData?.championPointsUntilNextLevel || 0,
				is_completed: aramChallenge ? aramChallenge.completedIds.includes(champion_id) : undefined
			};
		}).sort((a, b) => {
			// Sort by mastery level desc, then mastery points desc
			if (a.mastery_level !== b.mastery_level) {
				return b.mastery_level - a.mastery_level;
			}
			return b.mastery_points - a.mastery_points;
		});
	}, [isInAramChampSelect, session_data.champ_select_session, static_data.mastery_data, static_data.lcu_data, isAramMayhem]);

	// Get crowd favorite champions with completion status
	const crowd_favorite_data = useMemo<CrowdFavoriteChampion[]>(() => {
		return crowd_favorites.map(champion_id => ({
			champion_id,
			is_completed: static_data.lcu_data[ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID].completedIds.includes(champion_id)
		}));
	}, [crowd_favorites, static_data.lcu_data]);

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

			{static_data.connected && !arena_champ_select && !isInAramChampSelect && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">Not in champion select for Arena or ARAM</p>
					</CardContent>
				</Card>
			)}

			{static_data.connected && arena_champ_select && (
				<Card>
					<CardHeader>
						<CardTitle>Arena Crowd Favorites</CardTitle>
					</CardHeader>
					<CardContent>
						{!has_lcu_data ? (
							<p className="text-muted-foreground">Loading challenge data...</p>
						) : !static_data.lcu_data[ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID] ? (
							<p className="text-muted-foreground">Challenge data not available</p>
						) : crowd_favorite_data.length === 0 ? (
							<p className="text-muted-foreground">
								Loading crowd favorites... Make sure you're in Arena champion select.
							</p>
						) : (
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">
									{crowd_favorite_data.filter(c => c.is_completed).length} of {crowd_favorite_data.length} completed
								</p>
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Champion</TableHead>
												<TableHead className="text-center">Completed</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{crowd_favorite_data.map(({ champion_id, is_completed }) => (
												<TableRow key={champion_id}>
													<TableCell>
														<div className="flex items-center gap-2">
															<img
																src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champion_id}.png`}
																alt={champion_name(champion_id)}
																className="w-8 h-8 rounded"
															/>
															<span>{champion_name(champion_id)}</span>
														</div>
													</TableCell>
													<TableCell className="text-center">
														{is_completed ? (
															<Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
														) : (
															<X className="h-5 w-5 text-red-600 dark:text-red-400 mx-auto" />
														)}
													</TableCell>
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

			{static_data.connected && isInAramChampSelect && (
				<Card>
					<CardHeader>
						<CardTitle>ARAM Champions {isAramMayhem && "(Mayhem)"}</CardTitle>
					</CardHeader>
					<CardContent>
						{!has_lcu_data ? (
							<p className="text-muted-foreground">Loading challenge data...</p>
						) : aram_champions.length === 0 ? (
							<p className="text-muted-foreground">
								Loading champions... Make sure you're in ARAM champion select.
							</p>
						) : (
							<div className="space-y-2">
								{!isAramMayhem && (
									<p className="text-sm text-muted-foreground">
										All Random All Champions: {aram_champions.filter(c => c.is_completed).length} of {aram_champions.length} completed
									</p>
								)}
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Champion</TableHead>
												<TableHead>Mastery</TableHead>
												<TableHead>Points to Next Level</TableHead>
												{!isAramMayhem && <TableHead className="text-center">S- or Better</TableHead>}
											</TableRow>
										</TableHeader>
										<TableBody>
											{aram_champions.map((champ) => (
												<TableRow key={champ.champion_id}>
													<TableCell>
														<div className="flex items-center gap-2">
															<img
																src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champ.champion_id}.png`}
																alt={champion_name(champ.champion_id)}
																className="w-8 h-8 rounded"
															/>
															<span>{champion_name(champ.champion_id)}</span>
														</div>
													</TableCell>
													<TableCell>
														<Badge className={mastery_color(champ.mastery_level)}>
															{champ.mastery_level}
														</Badge>{" "}
														{champ.mastery_points.toLocaleString()}
													</TableCell>
													<TableCell>
														<Tooltip>
															<TooltipTrigger asChild>
																<div>
																	<div className="flex items-center gap-2">
																		<div className="w-full bg-gray-200 rounded-full h-1 dark:bg-gray-700">
																			<div
																				className={`h-1 rounded-full ${champ.points_until_next_level <= 0 ? 'bg-green-500' : 'bg-black'}`}
																				style={{
																					width: `${(champ.points_since_last_level / (champ.points_since_last_level + Math.max(0, champ.points_until_next_level))) * 100}%`
																				}}
																			></div>
																		</div>
																	</div>
																</div>
															</TooltipTrigger>
															<TooltipContent>
																<p>{champ.points_since_last_level}/{champ.points_since_last_level + champ.points_until_next_level}</p>
															</TooltipContent>
														</Tooltip>
													</TableCell>
													{!isAramMayhem && (
														<TableCell className="text-center">
															{champ.is_completed ? (
																<Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" />
															) : (
																<X className="h-5 w-5 text-red-600 dark:text-red-400 mx-auto" />
															)}
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