import React, { useEffect } from "react";
import "./App.css";
import { listen } from "@tauri-apps/api/event";
import { ChampionSummaryItem, ChampSelectSession, DatabaseData, GameflowSession, LCUData, page_name, PageData, RegionLocale, SummonerData, useData } from "@/data_context.tsx";
import { invoke } from "@tauri-apps/api/core";
import { createClient } from "@supabase/supabase-js";
import { lcu_get_request } from "@/lib/utils.ts";

import { Skeleton } from "@/components/ui/skeleton.tsx";
import Champions from "@/pages/champions.tsx";
import Debug from "@/pages/debug.tsx";
import Lobby from "@/pages/lobby.tsx";
import Profile from "@/pages/profile.tsx";

// const Champions = lazy(() => import("@/pages/champions.tsx"));
// const Debug = lazy(() => import("@/pages/debug.tsx"));

const page_components: Record<page_name, React.ComponentType> = {
	"home": Champions,
	"lobby": Lobby,
	"profile": Profile,
	"search": Champions,
	"settings": Champions,
	"debug": Debug,
}

const supabase = createClient("https://jvnhtmgsncslprdrnkth.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bmh0bWdzbmNzbHByZHJua3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQ2Mjc4ODMsImV4cCI6MjAxMDIwMzg4M30.OOjwsPjGHEc-x8MlhrOX64tJTNENqKqEq2635HKErrk");

export function refresh_data(setData: React.Dispatch<React.SetStateAction<PageData>>) {
	lcu_get_request<LCUData>("/lol-challenges/v1/challenges/local-player").then(lcu_data => {
		setData((prev: PageData) => ({...prev, lcu_data: lcu_data}));
	});
	// only if supabase down
	// invoke<MasteryDataEntry[]>("lcu_request", {method: "get", path: "/lol-champion-mastery/v1/local-player/champion-mastery"}).then(mastery_data => {
	// 	setData(prev => ({...prev, mastery_data: mastery_data}));
	// });
	lcu_get_request<SummonerData>("/lol-summoner/v1/current-summoner").then(summoner_data => {
		lcu_get_request<RegionLocale>("/riotclient/region-locale").then(region_data => {
			supabase.functions.invoke<DatabaseData>("get-user", { body: { riot_id: `${summoner_data.gameName}#${summoner_data.tagLine}`, region: region_data.region.toLowerCase() } }).then(database_data => {
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
		invoke<ChampionSummaryItem[]>("http_request", { url: "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json" }).then(x => {
			setData(prev => ({...prev, champion_map: Object.fromEntries(x.filter(c => c.id > 0 && c.id < 3000).map(c => [c.id, c]))}));
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
		lcu_get_request<ChampSelectSession>("/lol-champ-select/v1/session").then(x => {
			setData(prev => ({...prev, champ_select_session: x}));
		});
		const unlisten = listen<any>('champ-select', (event) => {
			console.log('Champ select event:', event.payload);
			if (event.payload && event.payload.data) {
				setData(prev => ({...prev, champ_select_session: event.payload.data as ChampSelectSession}));
			} else {
				setData(prev => ({...prev, champ_select_session: null}));
			}
		});

		return () => {
			unlisten.then(f => f());
		};
	}, []);

	useEffect(() => {
		lcu_get_request<GameflowSession>("/lol-gameflow/v1/session").then(x => {
			setData(prev => ({...prev, gameflow_session: x}));
		});
		const unlisten = listen<any>('gameflow', (event) => {
			console.log('Gameflow event:', event.payload);
			if (event.payload) {
				setData(prev => ({...prev, gameflow_session: event.payload.data as GameflowSession}));
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