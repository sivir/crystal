import React, { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { APIChampionSummary, APIChampSelectSession, APIDatabaseData, APIGameflowSession, APILCUChallengeMap, StaticData, APISkinMetadataMap, APIRegionLocale, APISummonerData, APIStatstonesData, StatstonesMap, useStaticData, useSessionData, APIEternalsData, APIMinimalSkin, APILootData, APIMasteryDataEntry } from "@/data_context.tsx";
import { invoke } from "@tauri-apps/api/core";
import { lcu_get_request, supabase_invoke } from "@/lib/utils.ts";
import { setLoading } from "@/lib/loading_state.ts";

import "./style.css";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { pages } from "@/pages_config.ts";

export function refresh_data(setStaticData: React.Dispatch<React.SetStateAction<StaticData>>, static_data: StaticData) {
	console.log("refreshing");
	if (!static_data.connected) {
		console.log("not connected, skipping refresh");
		return;
	}
	setLoading(true, 0);

	const promises: Promise<any>[] = [];
	let completed_tasks = 0;
	let total_tasks = 3 + Object.keys(static_data.champion_map).length;

	const update_progress = () => {
		completed_tasks++;
		setLoading(true, (completed_tasks / total_tasks) * 100);
	};

	promises.push(lcu_get_request<APILCUChallengeMap>("/lol-challenges/v1/challenges/local-player").then(lcu_data => {
		console.log("lcu_data", lcu_data);
		if (lcu_data != null) {
			setStaticData(prev => ({ ...prev, lcu_data }));
		}
		update_progress();
	}));

	if (static_data.mastery_data.length === 0) {
		total_tasks++;
		promises.push(lcu_get_request<APIMasteryDataEntry[]>("/lol-champion-mastery/v1/local-player/champion-mastery").then(mastery_data => {
			if (mastery_data != null) {
				setStaticData(prev => ({ ...prev, mastery_data }));
			}
			update_progress();
		}));
	}

	promises.push(lcu_get_request<APISummonerData>("/lol-summoner/v1/current-summoner").then(async summoner_data => {
		if (summoner_data != null) {
			lcu_get_request<APIMinimalSkin[]>(`/lol-champions/v1/inventories/${summoner_data.summonerId}/skins-minimal`).then(skins => {
				if (skins != null) {
					setStaticData(prev => ({ ...prev, minimal_skins: skins }));
				}
			});
		}
		const region_data = await lcu_get_request<APIRegionLocale>("/riotclient/region-locale");
		const database_data = await supabase_invoke<APIDatabaseData>("get-user", { riot_id: `${summoner_data.gameName}#${summoner_data.tagLine}`, region: region_data.region.toLowerCase() });
		if (database_data.data) {
			console.log("riot_data", database_data.data.riot_data);
			setStaticData(prev => ({ ...prev, riot_data: database_data.data.riot_data, mastery_data: database_data.data.mastery_data }));
		}
		update_progress();
	}));

	promises.push(lcu_get_request<APILootData>("/lol-loot/v2/player-loot-map").then(loot => {
		if (loot != null) {
			setStaticData(prev => ({ ...prev, loot_data: loot.playerLoot }));
		}
		update_progress();
	}));

	Object.keys(static_data.champion_map).forEach(champion_id => {
		promises.push(lcu_get_request<APIEternalsData>(`/lol-statstones/v2/player-statstones-self/${champion_id}`).then(eternals => {
			console.log("eternals", champion_id, eternals);
			if (eternals != null) {
				setStaticData(prev => {
					const new_map = new Map(prev.eternals_map);
					new_map.set(parseInt(champion_id), eternals);
					return { ...prev, eternals_map: new_map };
				});
				update_progress();
			}
		}));
	});

	Promise.all(promises).then(() => {
		setLoading(false, 100);
	}).catch((error) => {
		console.error("Error during refresh_data:", error);
		setLoading(false, 0);
	});
}

export default function App() {
	const { static_data, setStaticData, has_lcu_data } = useStaticData();
	const { setSessionData } = useSessionData();
	const PageComponent = pages[static_data.page].component;

	useEffect(() => {
		console.log("refresh_data effect triggered, connected:", static_data.connected, "champion_map length:", Object.keys(static_data.champion_map).length);
		refresh_data(setStaticData, static_data);
	}, [static_data.champion_map, static_data.connected]);

	useEffect(() => {
		console.log("DEBUG: static_data.connected changed to:", static_data.connected);
	}, [static_data.connected]);

	useEffect(() => {
		console.log("init");

		invoke<boolean>("get_connected").then(connected => {
			console.log("connected", connected);
			setStaticData(prev => {
				console.log("prev.connected: ", prev.connected, " -> new connected: ", connected);
				return { ...prev, connected };
			});
		});
		
		invoke<APIChampionSummary[]>("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json" }).then(x => {
			const champion_map = Object.fromEntries(x.filter(c => c.id > 0 && c.id < 3000).map(c => [c.id, c]));
			setStaticData(prev => ({ ...prev, champion_map }));
		});
		
		invoke<APISkinMetadataMap>("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json" }).then(skin_map => {
			setStaticData(prev => ({ ...prev, skin_map }));
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
		lcu_get_request<APIChampSelectSession>("/lol-champ-select/v1/session").then(x => setSessionData(prev => ({ ...prev, champ_select_session: x }))).catch(() => {}); // 404 when not in champ select
		const unlisten = listen<{ data: APIChampSelectSession }>('champ-select', (event) => {
			console.log('Champ select event:', event.payload);
			setSessionData(prev => ({ ...prev, champ_select_session: event.payload?.data }));
		});
		return () => {
			unlisten.then(f => f());
		};
	}, []);

	useEffect(() => {
		lcu_get_request<APIGameflowSession>("/lol-gameflow/v1/session")
			.then(x => setSessionData(prev => ({ ...prev, gameflow_session: x })))
			.catch(() => {}); // 404 when not in game
		const unlisten = listen<{ data: APIGameflowSession }>('gameflow', (event) => {
			console.log('Gameflow event:', event.payload);
			setSessionData(prev => ({ ...prev, gameflow_session: event.payload.data }));
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