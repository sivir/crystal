import React, { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { APIChampionSummary, APIChampSelectSession, APIDatabaseData, APIGameflowSession, APILCUChallengeMap, StaticData, APISkinMetadataMap, APIRegionLocale, APISummonerData, APIStatstonesData, StatstonesMap, useStaticData, useSessionData, APIEternalsData, APIMinimalSkin, APILootData, APIMasteryDataEntry, APILobbyMember } from "@/data_context.tsx";
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
		setLoading(false, 0);
		return;
	}
	setLoading(true, 0);

	const primary_promises: Promise<unknown>[] = [];
	let completed_tasks = 0;
	const total_tasks = 3;

	const update_progress = () => {
		completed_tasks++;
		setLoading(true, (completed_tasks / total_tasks) * 100);
	};

	primary_promises.push(
		lcu_get_request<APILCUChallengeMap>("/lol-challenges/v1/challenges/local-player")
			.then(lcu_data => {
				console.log("lcu_data", lcu_data);
				if (lcu_data != null) {
					setStaticData(prev => ({ ...prev, lcu_data }));
				}
			})
			.catch(error => console.error("Error refreshing LCU challenges:", error))
			.finally(update_progress)
	);

	primary_promises.push(
		lcu_get_request<APISummonerData>("/lol-summoner/v1/current-summoner")
			.then(async summoner_data => {
				console.log("summoner_data", summoner_data, performance.now());
				if (summoner_data == null) {
					return;
				}

				const region_data = await lcu_get_request<APIRegionLocale>("/riotclient/region-locale");
				console.log("region_data", region_data, performance.now());
				if (region_data == null) {
					console.error("Error refreshing riot profile data: missing region data");
					return;
				}

				const skins_promise = lcu_get_request<APIMinimalSkin[]>(`/lol-champions/v1/inventories/${summoner_data.summonerId}/skins-minimal`).catch(error => {
					console.error("Error refreshing minimal skins:", error);
					return null;
				});

				const supabase_body = {
					riot_id: `${summoner_data.gameName}#${summoner_data.tagLine}`,
					region: region_data.region.toLowerCase()
				};

				const supabase_start = performance.now();
				const database_data = await supabase_invoke<APIDatabaseData>("get-user", {
					...supabase_body
				}).catch(error => {
					console.error("Error refreshing riot profile data:", error);
					return null;
				}).then(database_data => {
					console.log(`supabase get-user (in flow) took ${(performance.now() - supabase_start).toFixed(1)}ms`);
					console.log("database_data", database_data);
					return database_data;
				});

				let has_database_mastery = false;

				if (database_data?.data) {
					console.log("riot_data", database_data.data.riot_data);
					setStaticData(prev => ({ ...prev, riot_data: database_data.data.riot_data }));

					if (database_data.data.mastery_data.length > 0) {
						setStaticData(prev => ({ ...prev, mastery_data: database_data.data.mastery_data }));
						has_database_mastery = true;
					}
				}

				if (!has_database_mastery) {
					const mastery_data = await lcu_get_request<APIMasteryDataEntry[]>("/lol-champion-mastery/v1/local-player/champion-mastery")
						.catch(error => {
							console.error("Error refreshing mastery data:", error);
							return null;
						});

					if (mastery_data != null) {
						setStaticData(prev => ({ ...prev, mastery_data }));
					}
				}

				const skins = await skins_promise;
				if (skins != null) {
					setStaticData(prev => ({ ...prev, minimal_skins: skins }));
				}
			})
			.catch(error => console.error("Error refreshing summoner data:", error))
			.finally(update_progress)
	);

	primary_promises.push(
		lcu_get_request<APILootData>("/lol-loot/v2/player-loot-map")
			.then(loot => {
				if (loot != null) {
					setStaticData(prev => ({ ...prev, loot_data: loot.playerLoot }));
				}
			})
			.catch(error => console.error("Error refreshing loot data:", error))
			.finally(update_progress)
	);

	Promise.all(primary_promises).then(() => {
		setLoading(false, 100);
	}).catch((error) => {
		console.error("Error during refresh_data:", error);
		setLoading(false, 0);
	});
}

export function refresh_eternals(setStaticData: React.Dispatch<React.SetStateAction<StaticData>>, static_data: StaticData) {
	if (!static_data.connected) {
		console.log("not connected, skipping eternals refresh");
		return;
	}

	const champion_ids = Object.keys(static_data.champion_map);
	if (champion_ids.length === 0) {
		console.log("no champion map, skipping eternals refresh");
		return;
	}

	console.log("refreshing eternals");
	setLoading(true, 0);
	setStaticData(prev => ({ ...prev, eternals_map: new Map() }));

	let completed = 0;
	const total = champion_ids.length;

	Promise.all(
		champion_ids.map(champion_id =>
			lcu_get_request<APIEternalsData>(`/lol-statstones/v2/player-statstones-self/${champion_id}`)
				.then(eternals => {
					console.log("eternals", champion_id, eternals);
					if (eternals != null) {
						setStaticData(prev => {
							const new_map = new Map(prev.eternals_map);
							new_map.set(parseInt(champion_id), eternals);
							return { ...prev, eternals_map: new_map };
						});
					}
				})
				.catch(error => console.error(`Error refreshing eternals for champion ${champion_id}:`, error))
				.finally(() => {
					completed++;
					setLoading(true, (completed / total) * 100);
				})
		)
	).then(() => {
		setLoading(false, 100);
	}).catch((error) => {
		console.error("Error during refresh_eternals:", error);
		setLoading(false, 0);
	});
}

function refresh_session_data(setSessionData: React.Dispatch<React.SetStateAction<{
	champ_select_session: APIChampSelectSession | null;
	gameflow_session: APIGameflowSession | null;
	lobby_member_puuids: string[];
}>>) {
	refresh_champ_select_session(setSessionData);
	refresh_lobby_members(setSessionData);
	refresh_gameflow_session(setSessionData);
}

function refresh_gameflow_session(setSessionData: React.Dispatch<React.SetStateAction<{
	champ_select_session: APIChampSelectSession | null;
	gameflow_session: APIGameflowSession | null;
	lobby_member_puuids: string[];
}>>) {
	lcu_get_request<APIGameflowSession>("/lol-gameflow/v1/session")
		.then(gameflow_session => setSessionData(prev => ({ ...prev, gameflow_session })))
		.catch(() => setSessionData(prev => ({ ...prev, gameflow_session: null })));
}

function refresh_champ_select_session(setSessionData: React.Dispatch<React.SetStateAction<{
	champ_select_session: APIChampSelectSession | null;
	gameflow_session: APIGameflowSession | null;
	lobby_member_puuids: string[];
}>>) {
	lcu_get_request<APIChampSelectSession>("/lol-champ-select/v1/session")
		.then(champ_select_session => setSessionData(prev => ({ ...prev, champ_select_session })))
		.catch(() => setSessionData(prev => ({ ...prev, champ_select_session: null })));
}

function refresh_lobby_members(setSessionData: React.Dispatch<React.SetStateAction<{
	champ_select_session: APIChampSelectSession | null;
	gameflow_session: APIGameflowSession | null;
	lobby_member_puuids: string[];
}>>) {
	lcu_get_request<APILobbyMember[]>("/lol-lobby/v2/lobby/members")
		.then(members => setSessionData(prev => ({ ...prev, lobby_member_puuids: (members ?? []).map(member => member.puuid) })))
		.catch(() => setSessionData(prev => ({ ...prev, lobby_member_puuids: [] })));
}

export default function App() {
	const { static_data, setStaticData, has_lcu_data } = useStaticData();
	const { session_data, setSessionData } = useSessionData();
	const [refresh_generation, setRefreshGeneration] = useState(0);
	const PageComponent = pages[static_data.page].component;

	useEffect(() => {
		console.log("refresh_data effect triggered, connected:", static_data.connected, "champion_map length:", Object.keys(static_data.champion_map).length);
		refresh_data(setStaticData, static_data);
		refresh_eternals(setStaticData, static_data);
	}, [static_data.champion_map, static_data.connected, refresh_generation]);

	useEffect(() => {
		console.log("DEBUG: static_data.connected changed to:", static_data.connected);
	}, [static_data.connected]);

	useEffect(() => {
		if (!static_data.connected) {
			setSessionData({ champ_select_session: null, gameflow_session: null, lobby_member_puuids: [] });
			setStaticData(prev => ({
				...prev,
				mastery_data: [],
				loot_data: {},
				minimal_skins: [],
				eternals_map: new Map(),
			}));
			setLoading(false, 0);
			return;
		}

		refresh_session_data(setSessionData);
	}, [static_data.connected, refresh_generation, setSessionData, setStaticData]);

	useEffect(() => {
		if (session_data.gameflow_session?.phase !== "ChampSelect") {
			setSessionData(prev => ({ ...prev, champ_select_session: null }));
			return;
		}
	}, [session_data.gameflow_session?.phase, setSessionData]);

	useEffect(() => {
		let is_active = true;
		let cleanup: Array<() => void> = [];

		const initialize_event_listeners = async () => {
			const [unlisten_connection, unlisten_champ_select, unlisten_gameflow, unlisten_lobby_members, unlisten_lcu_refresh] = await Promise.all([
				listen<boolean>("connection", (event) => {
					console.log("League connection status changed:", event.payload);
					setStaticData(prev => ({ ...prev, connected: event.payload }));
				}),
				listen<{ data: APIChampSelectSession }>("champ-select", (event) => {
					console.log("Champ select event:", event.payload);
					refresh_champ_select_session(setSessionData);
				}),
				listen<{ data: APIGameflowSession }>("gameflow", (event) => {
					console.log("Gameflow event:", event.payload);
					setSessionData(prev => ({ ...prev, gameflow_session: event.payload.data }));
					if (event.payload.data?.phase === "ChampSelect") {
						refresh_champ_select_session(setSessionData);
					}
				}),
				listen<{ data: APILobbyMember[], uri: string }>("lobby", (event) => {
					if (event.payload.uri != "/lol-lobby/v2/lobby/members") {
						return;
					}
					console.log("Lobby members event:", event.payload);
					setSessionData(prev => ({ ...prev, lobby_member_puuids: (event.payload.data ?? []).map(member => String(member.puuid)).filter(Boolean) }));
				}),
				listen<boolean>("lcu-refresh", () => {
					console.log("LCU refresh requested by backend");
					setRefreshGeneration(prev => prev + 1);
				}),
			]);

			if (!is_active) {
				unlisten_connection();
				unlisten_champ_select();
				unlisten_gameflow();
				unlisten_lobby_members();
				unlisten_lcu_refresh();
				return;
			}

			cleanup = [unlisten_connection, unlisten_champ_select, unlisten_gameflow, unlisten_lobby_members, unlisten_lcu_refresh];

			const connected = await invoke<boolean>("get_connected");
			if (!is_active) {
				return;
			}

			console.log("connected", connected);
			setStaticData(prev => {
				console.log("prev.connected: ", prev.connected, " -> new connected: ", connected);
				return { ...prev, connected };
			});

			if (connected) {
				refresh_session_data(setSessionData);
			}
		};

		initialize_event_listeners().then(() => {});

		return () => {
			is_active = false;
			cleanup.forEach(unlisten => unlisten());
		};
	}, [setSessionData, setStaticData]);

	useEffect(() => {
		console.log("init");

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
	}, [setStaticData]);

	return (
		<div className="container mx-auto">
			{has_lcu_data ? <PageComponent /> : <Skeleton />}
		</div>
	);
}