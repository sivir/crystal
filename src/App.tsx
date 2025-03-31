import "./App.css";
import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Bug, FlaskConical, Globe, HomeIcon, LayoutDashboard, Minus, Square, Users, X, UserSearch, Flame, VenetianMask } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

import Debug from "@/debug.tsx";
import Dashboard from "@/dashboard.tsx";
import Champions from "@/champions.tsx";
import Testing from "@/testing.tsx";
import { invoke } from "@tauri-apps/api/core";
import { ChallengeSummary, ChampionSummary, ChampionSummaryItem, default_riot_challenge_data, LCUChallengeData, MasteryData, RiotChallengeData, SkinMap, SummonerData } from "@/lib/types.ts";
import TeamBuilder from "@/team_builder.tsx";
import Lobby from "@/lobby.tsx";
import Profile from "@/search.tsx";
import Eternals from "@/eternals.tsx";
import Skins from "@/skins.tsx";

"use client";

const current_window = getCurrentWindow();
const supabase = createClient("https://jvnhtmgsncslprdrnkth.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bmh0bWdzbmNzbHByZHJua3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQ2Mjc4ODMsImV4cCI6MjAxMDIwMzg4M30.OOjwsPjGHEc-x8MlhrOX64tJTNENqKqEq2635HKErrk");

export default function Layout() {
	const [page, setPage] = useState('home');
	const [lobby, setLobby] = useState<string[]>([]);
	const [lobby_puuids, setLobbyPUUIDs] = useState<string[]>([]);
	const [lcu_challenge_data, setLCUChallengeData] = useState<LCUChallengeData>({});
	const [riot_challenge_data, setRiotChallengeData] = useState<RiotChallengeData>(default_riot_challenge_data);
	const [mastery_data, setMasteryData] = useState<MasteryData>([]);
	const [skin_map, setSkinMap] = useState<SkinMap>({});
	const [champion_map, setChampionMap] = useState<{[id: number]: ChampionSummaryItem}>({});
	const [challenge_summary, setChallengeSummary] = useState<ChallengeSummary>({challenges: {}});
	const [gameflow_phase, setGameflowPhase] = useState<string>("");
	const [riot_id, setRiotId] = useState<string[]>([]);

	const data_loaded = useMemo(() => {
		return mastery_data.length > 0 && Object.keys(champion_map).length > 0 && Object.keys(lcu_challenge_data).length > 0 && riot_challenge_data.challenges.length > 0;
	},	[mastery_data, champion_map, lcu_challenge_data, riot_challenge_data]);

	function update_lobby(puuids: string[]) {
		setLobbyPUUIDs(puuids);
		Promise.all(puuids.map(puuid => invoke("lcu_get_request", { url: "/lol-summoner/v2/summoners/puuid/" + puuid }).then(x => {
			const summoner = x as SummonerData;
			return summoner.gameName + "#" + summoner.tagLine;
		}))).then(setLobby);
	}

	useEffect(() => {
		invoke("lcu_get_request", { url: "/lol-lobby/v2/lobby/members" }).then(response => {
			const data = response as {puuid: number}[];
			const puuids = data.map((member: any) => member.puuid);
			update_lobby(puuids);
		});

		const unlisten_lobby = listen("lobby", (event) => {
			const event_puuids = event.payload as string[];
			if (JSON.stringify(event_puuids) !== JSON.stringify(lobby_puuids)) {
				update_lobby(event_puuids);
			}
		});

		invoke("lcu_get_request", { url: "/lol-gameflow/v1/gameflow-phase" }).then(x => {
			setGameflowPhase(x as string);
		});

		const unlisten_gameflow = listen("gameflow", (event) => {
			setGameflowPhase(event.payload as string);
		});

		invoke("lcu_get_request", { url: "/lol-challenges/v1/challenges/local-player" }).then(x => {
			console.log("lcu_challenge_data", x);
			setLCUChallengeData(x as LCUChallengeData);
		});

		// backup in case of non-na user (temporary)
		// invoke("lcu_get_request", { url: "/lol-champion-mastery/v1/local-player/champion-mastery" }).then(x => {
		// 	setMasteryData(x as MasteryData);
		// });

		invoke("lcu_get_request", { url: "/lol-summoner/v1/current-summoner" }).then(x => {
			const summoner_data = x as SummonerData;
			setRiotId([summoner_data.gameName, summoner_data.tagLine]);
			supabase.functions.invoke("get-user", { body: { riot_id: `${summoner_data.gameName}#${summoner_data.tagLine}` } }).then(({ data }) => {
				const json_data = JSON.parse(data);
				console.log("mastery_data", json_data.mastery_data);
				setRiotChallengeData(json_data.riot_data);
				console.log("riot_data", json_data.riot_data);
				setMasteryData(json_data.mastery_data);
			});
		});

		invoke("ws_init").then(x => console.log(x));

		invoke("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json" }).then(x => {
			setChampionMap(Object.fromEntries(Object.entries(x as ChampionSummary).filter(y => y[1].id > 0 && y[1].id < 3000).map(([, value]) => [value.id, value])));
		});

		invoke("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/challenges.json" }).then(x => {
			setChallengeSummary(x as ChallengeSummary);
		});

		invoke("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json" }).then(x => {
			setSkinMap(x as SkinMap);
		});

		return () => {
			unlisten_lobby.then(f => f());
			unlisten_gameflow.then(f => f());
		};
	}, []);

	const navItems = [
		{ icon: HomeIcon, text: 'Home', id: 'home' },
		{ icon: UserSearch, text: 'Summoner Lookup', id: 'search' },
		{ icon: LayoutDashboard, text: 'Lobby', id: 'lobby' },
		{ icon: Users, text: 'Champions', id: 'champions' },
		{ icon: Flame, text: 'Eternals', id: 'eternals' },
		{ icon: Globe, text: 'Team Builder', id: 'globes' },
		{ icon: VenetianMask, text: 'Skins', id: 'skins' },
		{ icon: FlaskConical, text: 'Testing', id: 'test' },
		{ icon: Bug, text: 'Debug', id: 'help' }
	];

	return (
		<div className="min-h-screen bg-white dark:bg-gray-900 flex">
			<div className="fixed top-0 right-0 m-4 flex space-x-2 z-50">
				<Button
					variant="ghost"
					size="icon"
					className="w-3 h-3 bg-yellow-400 rounded-full hover:bg-yellow-500 focus:outline-none"
					onClick={() => current_window.minimize()}
				>
					<Minus className="h-2 w-2 text-yellow-800" />
					<span className="sr-only">Minimize</span>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="w-3 h-3 bg-green-400 rounded-full hover:bg-green-500 focus:outline-none"
					onClick={() => current_window.toggleMaximize()}
				>
					<Square className="h-2 w-2 text-green-800" />
					<span className="sr-only">Maximize</span>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="w-3 h-3 bg-red-400 rounded-full hover:bg-red-500 focus:outline-none"
					onClick={() => current_window.close()}
				>
					<X className="h-2 w-2 text-red-800" />
					<span className="sr-only">Close</span>
				</Button>
			</div>
			{!data_loaded ? <>loading</> : <>
			<aside className="fixed top-0 left-0 z-40 w-64 h-screen">
				<div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
					<div className="flex items-center pl-2.5 mb-5">
						<img
							src="https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/challenges-shared/challenge-intro-modal-diamond.png"
							// src="https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/rarity-gem-icons/transcendent.png"
							width="32" className="mr-2" alt="Logo" />
						<span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">crystal</span>
					</div>
					<ul className="space-y-2 font-medium">
						{navItems.map((item) => (
							<li key={item.id}>
								<Button
									variant="ghost"
									className={`w-full justify-start ${page === item.id ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
									onClick={() => setPage(item.id)}
								>
									<item.icon className="w-5 h-5 mr-3" />
									{item.text}
								</Button>
							</li>
						))}
					</ul>
				</div>
			</aside>

			<div className="flex-1 ml-64 flex flex-col h-screen">
				<div className="h-16 flex flex-col justify-between px-4" data-tauri-drag-region="true" />
				<main className="flex-1 overflow-y-auto p-4">
					<div style={{ display: page === 'home' ? "" : "none" }}><Dashboard riot_id={riot_id} lcu_challenge_data={lcu_challenge_data} riot_challenge_data={riot_challenge_data} setPage={setPage} challenge_summary={challenge_summary} />
					</div>
					<div style={{ display: page === 'search' ? "" : "none" }}><Profile supabase={supabase} lcu_challenge_data={lcu_challenge_data} /></div>
					<div style={{ display: page === 'lobby' ? "" : "none" }}><Lobby lobby={lobby} supabase={supabase} lcu_challenge_data={lcu_challenge_data} champion_map={champion_map} mastery_data={mastery_data} /></div>
					<div style={{ display: page === 'champions' ? "" : "none" }}><Champions mastery_data={mastery_data} champion_map={champion_map} lcu_challenge_data={lcu_challenge_data} /></div>
					<div style={{ display: page === 'eternals' ? "" : "none" }}><Eternals champion_map={champion_map} /></div>
					<div style={{ display: page === 'globes' ? "" : "none" }}><TeamBuilder champion_map={champion_map} lcu_challenge_data={lcu_challenge_data} /></div>
					<div style={{ display: page === 'skins' ? "" : "none" }}><Skins champion_map={champion_map} skin_map={skin_map} /></div>
					<div style={{ display: page === 'test' ? "" : "none" }}><Testing /></div>
					<div style={{ display: page === 'help' ? "" : "none" }}><Debug lobby={lobby} gameflow_phase={gameflow_phase} champion_map={champion_map} riot_challenge_data={riot_challenge_data} /></div>
				</main>
			</div>
			</>}
		</div>
	);
}