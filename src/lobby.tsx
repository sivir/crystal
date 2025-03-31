import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { SupabaseClient } from "@supabase/supabase-js";
import { ChampionSummaryItem, LCUChallengeData, MasteryData, RiotChallengeData } from "@/lib/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Check, RefreshCw, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

function is_globe_or_harmony(challenge: any) {
	return (challenge.capstoneGroupName === "Globetrotter" || challenge.capstoneGroupName === "Harmony") && challenge.isCapstone == false;
}

function calculateColumnSum(column: number[], max: number) {
	return column.reduce((sum, num) => sum + Math.min(num, max), 0) / max / column.length * 100;
}

type LobbyChallenge = {
	value: number;
	level: string;
};

type ChampSelect = {
	myTeam: {
		championId: number;
		cellId: number;
	}[];
	benchChampions: {
		championId: number;
	}[];
}

export default function Lobby({ lobby, supabase, lcu_challenge_data, champion_map, mastery_data }: {
	lobby: string[],
	supabase: SupabaseClient,
	lcu_challenge_data: LCUChallengeData,
	champion_map: { [_: number]: ChampionSummaryItem },
	mastery_data: MasteryData
}) {
	const [data, setData] = useState<LobbyChallenge[][]>([[]]);
	const [aram_champ_select, setAramChampSelect] = useState<{champion_id: number, cell_id: number}[]>([]);
	const globes_and_harmonies = useMemo(() => Object.entries(lcu_challenge_data).filter(([, value]) => is_globe_or_harmony(value)), [lcu_challenge_data]);

	function aram_swap(id: number) {
		const champ_select = aram_champ_select.find(champion => champion.champion_id === id);
		if (champ_select === undefined) {
			return;
		}
		if (champ_select.cell_id > 0) {
			console.log(champ_select);
			invoke("lcu_post_request", {url: `/lol-champ-select/v1/session/trades/${champ_select.cell_id}/request`, body: ""}).then(console.log);
		} else {
			invoke("lcu_post_request", {url: `/lol-champ-select/v1/session/bench/swap/${champ_select.champion_id}`, body: ""}).then(console.log);
		}
	}

	useMemo(() => {
		console.log("lobby change:" + lobby);
		Promise.all(lobby.map(riot_id =>
			supabase.functions.invoke("get-user", { body: { riot_id } }).then(({ data }) => {
				const json_data = JSON.parse(data);
				return json_data.riot_data;
			})
		)).then((r: RiotChallengeData[]) => {
			console.log(lobby, r);
			if (r.length === 0) {
				setData([[]]);
			} else {
				setData(r.map(challenge_data => globes_and_harmonies.map(([key]) => {
					const current_data = challenge_data.challenges.find(x => x.challengeId === parseInt(key));
					if (current_data === undefined) {
						return { value: 0, level: "IRON" };
					}
					return { value: current_data.value, level: current_data.level };
				})));
			}
		});
	}, [JSON.stringify(lobby), lcu_challenge_data]);

	const sums = useMemo(() => {
		return data[0].map((_, colIndex) => calculateColumnSum(data.map(row => row[colIndex].value), globes_and_harmonies[colIndex][1].thresholds["MASTER"].value));
	}, [data]);
	const sortedIndices = useMemo(() => sums.map((_, index) => index).sort((a, b) => sums[a] - sums[b]), [sums]);

	return (
		<div className="flex flex-col gap-y-4 items-start">
			<Card className="p-4 overflow-x-auto">
				<div className={`grid grid-cols-[auto_repeat(25,1fr)]`}>
					<div className="font-bold">Name</div>
					{sortedIndices.map(index => (
						<div key={`header-${index}`}></div>
					))}

					{data.map((row, rowIndex) => {
						return (
							<React.Fragment key={`row-${rowIndex}`}>
								<div className="font-semibold">{lobby[rowIndex]}</div>
								{sortedIndices.map(colIndex => {
									return (
										<div key={`cell-${rowIndex}-${colIndex}`} className="w-12 h-12 flex items-center justify-center mx-auto relative bg-cover"
										     style={{ backgroundImage: `url(https://raw.communitydragon.org/latest/game/assets/challenges/config/${globes_and_harmonies[colIndex][0]}/tokens/${row[colIndex].level.toLowerCase()}.png)` }}>
											<span className="absolute bottom-0 right-0 text-xs font-semibold bg-white/70 px-1 rounded-bl-md rounded-tr-md">
												{row[colIndex].value}
											</span>
										</div>
									);
								})}
							</React.Fragment>
						);
					})}

					<div className="font-semibold">Progression</div>
					{sortedIndices.map(colIndex => (
						<div key={`sum-${colIndex}`} className="text-center font-semibold">
							{sums[colIndex].toFixed(1)}
						</div>
					))}
				</div>
			</Card>
			<Button onClick={() => {
				invoke("lcu_get_request", { url: "/lol-champ-select/v1/session" }).then(champ_select_data => {
					invoke("lcu_get_request", { url: "/lol-champ-select/v1/session/trades" }).then(trade_data => {
						const champ_select = champ_select_data as ChampSelect;
						const trades = trade_data as {cellId: number, id: number}[];
						const my_team = champ_select.myTeam;
						const bench = champ_select.benchChampions;
						console.log("asdf", my_team, bench);
						setAramChampSelect(my_team.map(selection => {return {champion_id: selection.championId, cell_id: trades.find(x => x.cellId === selection.cellId)?.id ?? -1}}).concat(bench.map(selection => {return {champion_id: selection.championId, cell_id: -1}})));
					});
				});
			}}>get champ select data</Button>
			<div className="border rounded-lg overflow-hidden">sd
				<div className="max-h-[600px] overflow-auto">
					<table>
						<thead className="bg-gray-100 sticky top-0">
						<tr>
							<th className="p-3 text-left">Champion</th>
							<th className="p-3 text-left" colSpan={2}>Mastery</th>
							<th className="p-3 text-left">s-</th>
							<th className="p-3 w-20"></th>
						</tr>
						</thead>
						<tbody>
						{aram_champ_select.map((champ) => (
							<tr key={champ.champion_id} className="border-t">
								<td className="p-3">
									<div className="flex items-center space-x-3">
										<img
											src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/${champion_map[champ.champion_id].squarePortraitPath.substring(25)}`}
											alt={champion_map[champ.champion_id].name}
											width={40}
											height={40}
											className="rounded-full"
										/>
										<span>{champion_map[champ.champion_id].name}</span>
									</div>
								</td>
								<td className="p-3 pr-0 w-16">
									<span className="font-semibold">{mastery_data.find(champion => champion.championId === champ.champion_id)?.championLevel ?? 0}</span>
								</td>
								<td className="p-3 pl-2">
									<span className="font-semibold">{mastery_data.find(champion => champion.championId === champ.champion_id)?.championPoints ?? 0}</span>
								</td>
								<td className="p-3">
									<span className="font-semibold">{lcu_challenge_data[101301].completedIds.includes(champ.champion_id) ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}</span>
								</td>
								<td className="p-3">
									<Button
										size="icon"
										variant="ghost"
										onClick={() => aram_swap(champ.champion_id)}
									>
										<RefreshCw className="h-4 w-4" />
									</Button>
								</td>
							</tr>
						))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}