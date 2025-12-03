import React, { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { APIChampionSummary, APIChampSelectSession, APIDatabaseData, APIGameflowSession, APILCUChallengeMap, page_name, StaticData, APISkinMetadataMap, APIRegionLocale, APISummonerData, APIStatstonesData, StatstonesMap, useStaticData, useSessionData, APIEternalsData, APIChampionSummaryMap, APIMinimalSkin, APILootData } from "@/data_context.tsx";
import { invoke } from "@tauri-apps/api/core";
import { lcu_get_request, supabase_invoke } from "@/lib/utils.ts";
import { setLoading } from "@/lib/loading_state.ts";

import "./App.css";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import Champions from "@/pages/champions.tsx";
import Debug from "@/pages/debug.tsx";
import Lobby from "@/pages/lobby.tsx";
import Profile from "@/pages/profile.tsx";
import Skins from "@/pages/skins.tsx";
import Eternals from "@/pages/eternals.tsx";
import TeamBuilder from "@/pages/team_builder.tsx";
import User from "@/pages/user.tsx";

const page_components: Record<page_name, React.ComponentType> = {
	"home": Champions,
	"lobby": Lobby,
	"profile": Profile,
	"skins": Skins,
	"eternals": Eternals,
	"team_builder": TeamBuilder,
	"settings": Champions,
	"debug": Debug,
	"user": User,
}

export function refresh_data(setStaticData: React.Dispatch<React.SetStateAction<StaticData>>, champion_map?: APIChampionSummaryMap) {
	setLoading(true, 0);

	const promises: Promise<any>[] = [];
	let completed_tasks = 0;
	const total_tasks = 3 + (champion_map ? Object.keys(champion_map).length : 0);

	const update_progress = () => {
		completed_tasks++;
		setLoading(true, (completed_tasks / total_tasks) * 100);
	};

	promises.push(lcu_get_request<APILCUChallengeMap>("/lol-challenges/v1/challenges/local-player").then(lcu_data => {
		console.log("lcu_data", lcu_data);
		setStaticData(prev => ({ ...prev, lcu_data: lcu_data }));
		update_progress();
	}));

	promises.push(lcu_get_request<APISummonerData>("/lol-summoner/v1/current-summoner").then(async summoner_data => {
		// Fetch skins using summonerId
		lcu_get_request<APIMinimalSkin[]>(`/lol-champions/v1/inventories/${summoner_data.summonerId}/skins-minimal`).then(skins => {
			setStaticData(prev => ({ ...prev, minimal_skins: skins }));
		});

		const region_data = await lcu_get_request<APIRegionLocale>("/riotclient/region-locale");
		const database_data = await supabase_invoke<APIDatabaseData>("get-user", { riot_id: `${summoner_data.gameName}#${summoner_data.tagLine}`, region: region_data.region.toLowerCase() });
		if (database_data.data) {
			console.log("riot_data", database_data.data.riot_data);
			setStaticData(prev => ({ ...prev, riot_data: database_data.data.riot_data, mastery_data: database_data.data.mastery_data }));
		}
		update_progress();
	}));

	// Loot Data
	promises.push(lcu_get_request<APILootData>("/lol-loot/v2/player-loot-map").then(loot => {
		setStaticData(prev => ({ ...prev, loot_data: loot.playerLoot }));
		update_progress();
	}));

	if (champion_map) {
		Object.keys(champion_map).forEach(champion_id => {
			promises.push(lcu_get_request<APIEternalsData>(`/lol-statstones/v2/player-statstones-self/${champion_id}`).then(eternals => {
				setStaticData(prev => {
					const new_map = new Map(prev.eternals_map);
					new_map.set(parseInt(champion_id), eternals);
					return { ...prev, eternals_map: new_map };
				});
				update_progress();
			}));
		});
	}

	Promise.all(promises).then(() => {
		setLoading(false, 100);
	});
}

export default function App() {
	const { static_data, setStaticData, has_lcu_data } = useStaticData();
	const { setSessionData } = useSessionData();
	const PageComponent = page_components[static_data.page];

	useEffect(() => {
		console.log("init");
		
		invoke<APIChampionSummary[]>("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json" }).then(x => {
			const champion_map = Object.fromEntries(x.filter(c => c.id > 0 && c.id < 3000).map(c => [c.id, c]));
			setStaticData(prev => ({ ...prev, champion_map }));
			refresh_data(setStaticData, champion_map);
		});

		invoke<boolean>("get_connected").then(x => {
			setStaticData(prev => ({ ...prev, connected: x }));
		});
		
		invoke<APISkinMetadataMap>("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json" }).then(x => {
			setStaticData(prev => ({ ...prev, skin_map: x }));
		});
		invoke<APIStatstonesData>("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/statstones.json" }).then(x => {
			const statstones_map: StatstonesMap = {};
			x.statstoneData.forEach(set => {
				statstones_map[set.itemId.toString()] = set;
			});
			setStaticData(prev => ({ ...prev, statstones_map }));
		});
	}, []);

	useEffect(() => {
		const unlisten = listen<boolean>('connection', (event) => {
			console.log('League connection status changed:', event.payload);
			setStaticData(prev => ({ ...prev, connected: event.payload }));
		});
		return () => {
			unlisten.then(f => f());
		};
	}, []);

	useEffect(() => {
		lcu_get_request<APIChampSelectSession>("/lol-champ-select/v1/session").then(x => {
			setSessionData(prev => ({ ...prev, champ_select_session: x }));
		});
		const unlisten = listen<any>('champ-select', (event) => {
			console.log('Champ select event:', event.payload);
			if (event.payload && event.payload.data) {
				setSessionData(prev => ({ ...prev, champ_select_session: event.payload.data as APIChampSelectSession }));
			} else {
				setSessionData(prev => ({ ...prev, champ_select_session: null }));
			}
		});
		return () => {
			unlisten.then(f => f());
		};
	}, []);

	useEffect(() => {
		lcu_get_request<APIGameflowSession>("/lol-gameflow/v1/session").then(x => {
			setSessionData(prev => ({ ...prev, gameflow_session: x }));
		});
		const unlisten = listen<any>('gameflow', (event) => {
			console.log('Gameflow event:', event.payload);
			if (event.payload) {
				setSessionData(prev => ({ ...prev, gameflow_session: event.payload.data as APIGameflowSession }));
			} else {
				setSessionData(prev => ({ ...prev, gameflow_session: null }));
			}
		});
		return () => {
			unlisten.then(f => f());
		};
	}, []);

	return (
		<div className="container">
			{has_lcu_data ? <PageComponent /> : <Skeleton />}
		</div>
	);
}