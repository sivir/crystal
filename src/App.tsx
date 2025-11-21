import React, { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { APIChampionSummary, APIChampSelectSession, APIDatabaseData, APIGameflowSession, APILCUChallengeMap, page_name, PageData, APIRegionLocale, APISummonerData, useData } from "@/data_context.tsx";
import { invoke } from "@tauri-apps/api/core";
import { lcu_get_request, supabase_invoke } from "@/lib/utils.ts";

import "./App.css";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import Champions from "@/pages/champions.tsx";
import Debug from "@/pages/debug.tsx";
import Lobby from "@/pages/lobby.tsx";
import Profile from "@/pages/profile.tsx";
import Skins from "@/pages/skins.tsx";

const page_components: Record<page_name, React.ComponentType> = {
	"home": Champions,
	"lobby": Lobby,
	"profile": Profile,
	"skins": Skins,
	"settings": Champions,
	"debug": Debug,
}

export function refresh_data(setData: React.Dispatch<React.SetStateAction<PageData>>) {
	lcu_get_request<APILCUChallengeMap>("/lol-challenges/v1/challenges/local-player").then(lcu_data => {
		setData((prev: PageData) => ({...prev, lcu_data: lcu_data}));
	});
	// only if supabase down
	// invoke<APIMasteryDataEntry[]>("lcu_request", {method: "get", path: "/lol-champion-mastery/v1/local-player/champion-mastery"}).then(mastery_data => {
	// 	setData(prev => ({...prev, mastery_data: mastery_data}));
	// });
	lcu_get_request<APISummonerData>("/lol-summoner/v1/current-summoner").then(summoner_data => {
		lcu_get_request<APIRegionLocale>("/riotclient/region-locale").then(region_data => {
			supabase_invoke<APIDatabaseData>("get-user",  { riot_id: `${summoner_data.gameName}#${summoner_data.tagLine}`, region: region_data.region.toLowerCase() }).then(database_data => {
				console.log("supabase data", database_data);
				if (database_data.data === null) {
					return;
				}
				console.log("riot_data", database_data.data.riot_data);
				setData(prev => ({...prev, riot_data: database_data.data.riot_data, mastery_data: database_data.data.mastery_data}));
			});
		});
	});
}

export default function App() {
	const {data, setData} = useData();
	const PageComponent = page_components[data.page];

	useEffect(() => {
		console.log("init");
		refresh_data(setData);
		invoke<boolean>("get_connected").then(x => {
			setData(prev => ({...prev, connected: x}));
		});
		invoke<APIChampionSummary[]>("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json" }).then(x => {
			setData(prev => ({...prev, champion_map: Object.fromEntries(x.filter(c => c.id > 0 && c.id < 3000).map(c => [c.id, c]))}));
		});
		invoke<APISkinMetadataMap>("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/skins.json" }).then(x => {
			setData(prev => ({...prev, skin_map: x}));
		});
	}, []);

	useEffect(() => {
		const unlisten = listen<boolean>('connection', (event) => {
			console.log('League connection status changed:', event.payload);
			setData(prev => ({...prev, connected: event.payload}));
		});
		return () => {
			unlisten.then(f => f());
		};
	}, []);

	useEffect(() => {
		lcu_get_request<APIChampSelectSession>("/lol-champ-select/v1/session").then(x => {
			setData(prev => ({...prev, champ_select_session: x}));
		});
		const unlisten = listen<any>('champ-select', (event) => {
			console.log('Champ select event:', event.payload);
			if (event.payload && event.payload.data) {
				setData(prev => ({...prev, champ_select_session: event.payload.data as APIChampSelectSession}));
			} else {
				setData(prev => ({...prev, champ_select_session: null}));
			}
		});
		return () => {
			unlisten.then(f => f());
		};
	}, []);

	useEffect(() => {
		lcu_get_request<APIGameflowSession>("/lol-gameflow/v1/session").then(x => {
			setData(prev => ({...prev, gameflow_session: x}));
		});
		const unlisten = listen<any>('gameflow', (event) => {
			console.log('Gameflow event:', event.payload);
			if (event.payload) {
				setData(prev => ({...prev, gameflow_session: event.payload.data as APIGameflowSession}));
			} else {
				setData(prev => ({...prev, gameflow_session: null}));
			}
		});
		return () => {
			unlisten.then(f => f());
		};
	}, []);

	return (
		<div className="container">
			{data.has_lcu_data ? <PageComponent /> : <Skeleton />}
		</div>
	);
}