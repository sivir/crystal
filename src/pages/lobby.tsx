import { useData } from "@/data_context";
import { useEffect, useMemo, useState } from "react";
import { champion_name, lcu_get_request } from "@/lib/utils.ts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, X } from "lucide-react";
import { APIChampSelectPlayer } from "@/data_context";

const ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID = 602002; // arena (win on all champs)
const ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID = 101301; // aram (s- or better on all champs)

type CrowdFavoriteChampion = {
	championId: number;
	isCompleted: boolean;
};

type ChampionMasteryDisplay = {
	championId: number;
	masteryLevel: number;
	masteryPoints: number;
	pointsSinceLastLevel: number;
	pointsUntilNextLevel: number;
	isCompleted?: boolean; // For challenge completion
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
	const { data } = useData();
	const [crowd_favorites, set_crowd_favorites] = useState<number[]>([]);

	const game_mode = useMemo(() => {
		if (!data.gameflow_session) {
			return null;
		}
		const queue_id = data.gameflow_session.gameData?.queue?.id ?? 450;
		return queue_ids[queue_id] ?? null;
	}, [data.gameflow_session]);

	const arena_champ_select = game_mode === "arena" && data.gameflow_session?.phase == "ChampSelect";
	const isInAramChampSelect = (game_mode === "aram" || game_mode === "aram-mayhem") && data.gameflow_session?.phase == "ChampSelect";
	const isAramMayhem = game_mode === "aram-mayhem";

	useEffect(() => {
		if (arena_champ_select && data.connected) {
			lcu_get_request<number[]>("/lol-lobby-team-builder/champ-select/v1/crowd-favorte-champion-list").then((response) => { // typo is intentional
				console.log("Crowd favorite champions:", response);
				set_crowd_favorites(response);
			});
		} else {
			set_crowd_favorites([]);
		}
	}, [arena_champ_select, data.connected]);

	// Get ARAM champions (team + bench)
	const aram_champions = useMemo<ChampionMasteryDisplay[]>(() => {
		if (!isInAramChampSelect || !data.champ_select_session) return [];

		const session = data.champ_select_session;
		const champion_ids = session.myTeam.map((player: APIChampSelectPlayer) => player.championId).concat(session.benchChampions.map((benchChamp: any) => benchChamp.championId)).filter(id => id > 0);

		const aramChallenge = !isAramMayhem ? data.lcu_data[ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID] : null;

		return champion_ids.map(championId => {
			const masteryData = data.mastery_data.find(m => m.championId === championId);
			return {
				championId,
				masteryLevel: masteryData?.championLevel || 0,
				masteryPoints: masteryData?.championPoints || 0,
				pointsSinceLastLevel: masteryData?.championPointsSinceLastLevel || 0,
				pointsUntilNextLevel: masteryData?.championPointsUntilNextLevel || 0,
				isCompleted: aramChallenge ? aramChallenge.completedIds.includes(championId) : undefined
			};
		}).sort((a, b) => {
			// Sort by mastery level desc, then mastery points desc
			if (a.masteryLevel !== b.masteryLevel) {
				return b.masteryLevel - a.masteryLevel;
			}
			return b.masteryPoints - a.masteryPoints;
		});
	}, [isInAramChampSelect, data.champ_select_session, data.mastery_data, data.lcu_data, isAramMayhem]);

	// Get crowd favorite champions with completion status
	const crowd_favorite_data = useMemo<CrowdFavoriteChampion[]>(() => {
		return crowd_favorites.map(championId => ({
			championId,
			isCompleted: data.lcu_data[ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID].completedIds.includes(championId)
		}));
	}, [crowd_favorites, data.lcu_data]);

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Lobby</h1>

			{!data.connected && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">Not connected to League client</p>
					</CardContent>
				</Card>
			)}

			{data.connected && !arena_champ_select && !isInAramChampSelect && (
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">Not in champion select for Arena or ARAM</p>
					</CardContent>
				</Card>
			)}

			{data.connected && arena_champ_select && (
				<Card>
					<CardHeader>
						<CardTitle>Arena Crowd Favorites</CardTitle>
					</CardHeader>
					<CardContent>
						{!data.has_lcu_data ? (
							<p className="text-muted-foreground">Loading challenge data...</p>
						) : !data.lcu_data[ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID] ? (
							<p className="text-muted-foreground">Challenge data not available</p>
						) : crowd_favorite_data.length === 0 ? (
							<p className="text-muted-foreground">
								Loading crowd favorites... Make sure you're in Arena champion select.
							</p>
						) : (
							<div className="space-y-2">
								<p className="text-sm text-muted-foreground">
									{crowd_favorite_data.filter(c => c.isCompleted).length} of {crowd_favorite_data.length} completed
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
											{crowd_favorite_data.map(({ championId, isCompleted }) => (
												<TableRow key={championId}>
													<TableCell>
														<div className="flex items-center gap-2">
															<img
																src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`}
																alt={champion_name(championId)}
																className="w-8 h-8 rounded"
															/>
															<span>{champion_name(championId)}</span>
														</div>
													</TableCell>
													<TableCell className="text-center">
														{isCompleted ? (
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

			{data.connected && isInAramChampSelect && (
				<Card>
					<CardHeader>
						<CardTitle>ARAM Champions {isAramMayhem && "(Mayhem)"}</CardTitle>
					</CardHeader>
					<CardContent>
						{!data.has_lcu_data ? (
							<p className="text-muted-foreground">Loading challenge data...</p>
						) : aram_champions.length === 0 ? (
							<p className="text-muted-foreground">
								Loading champions... Make sure you're in ARAM champion select.
							</p>
						) : (
							<div className="space-y-2">
								{!isAramMayhem && (
									<p className="text-sm text-muted-foreground">
										All Random All Champions: {aram_champions.filter(c => c.isCompleted).length} of {aram_champions.length} completed
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
												<TableRow key={champ.championId}>
													<TableCell>
														<div className="flex items-center gap-2">
															<img
																src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${champ.championId}.png`}
																alt={champion_name(champ.championId)}
																className="w-8 h-8 rounded"
															/>
															<span>{champion_name(champ.championId)}</span>
														</div>
													</TableCell>
													<TableCell>
														<Badge className={mastery_color(champ.masteryLevel)}>
															{champ.masteryLevel}
														</Badge>{" "}
														{champ.masteryPoints.toLocaleString()}
													</TableCell>
													<TableCell>
														<Tooltip>
															<TooltipTrigger asChild>
																<div>
																	<div className="flex items-center gap-2">
																		<div className="w-full bg-gray-200 rounded-full h-1 dark:bg-gray-700">
																			<div
																				className={`h-1 rounded-full ${champ.pointsUntilNextLevel <= 0 ? 'bg-green-500' : 'bg-black'}`}
																				style={{
																					width: `${(champ.pointsSinceLastLevel / (champ.pointsSinceLastLevel + Math.max(0, champ.pointsUntilNextLevel))) * 100}%`
																				}}
																			></div>
																		</div>
																	</div>
																</div>
															</TooltipTrigger>
															<TooltipContent>
																<p>{champ.pointsSinceLastLevel}/{champ.pointsSinceLastLevel + champ.pointsUntilNextLevel}</p>
															</TooltipContent>
														</Tooltip>
													</TableCell>
													{!isAramMayhem && (
														<TableCell className="text-center">
															{champ.isCompleted ? (
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