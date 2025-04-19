import React, { useEffect } from "react";
import "./App.css";
import { listen } from "@tauri-apps/api/event";
import { ChampionSummaryItem, DatabaseData, LCUData, RegionLocale, SummonerData, useData } from "@/data_context.tsx";
import { invoke } from "@tauri-apps/api/core";
import { page_name, PageData } from "@/data_context.tsx";

import Champions from "@/pages/champions.tsx";
import Debug from "@/pages/debug.tsx";

import { createClient } from "@supabase/supabase-js";

// const Champions = lazy(() => import("@/pages/champions.tsx"));
// const Debug = lazy(() => import("@/pages/debug.tsx"));

const page_components: Record<page_name, React.ComponentType> = {
	"home": Champions,
	"inbox": Champions,
	"calendar": Champions,
	"search": Champions,
	"settings": Champions,
	"debug": Debug,
}

const supabase = createClient("https://jvnhtmgsncslprdrnkth.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bmh0bWdzbmNzbHByZHJua3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQ2Mjc4ODMsImV4cCI6MjAxMDIwMzg4M30.OOjwsPjGHEc-x8MlhrOX64tJTNENqKqEq2635HKErrk");

async function lcu_get_request<t>(path: string) {
	const x = await invoke<t>("lcu_request", { method: "get", path: path });
	console.log("get", path, x);
	return x;
}

export function refresh_data(setData: React.Dispatch<React.SetStateAction<PageData>>) {
	lcu_get_request<LCUData>("/lol-challenges/v1/challenges/local-player").then(lcu_data => {
		setData((prev: PageData) => ({...prev, lcu_data: lcu_data}));
	});
	// only if supabase down
	// invoke<MasteryDataEntry[]>("lcu_request", {method: "get", path: "/lol-champion-mastery/v1/local-player/champion-mastery"}).then(mastery_data => {
	// 	setData(prev => ({...prev, mastery_data: mastery_data}));
	// });
	invoke<SummonerData>("lcu_request", {method: "get", path: "/lol-summoner/v1/current-summoner"}).then(summoner_data => {
		invoke<RegionLocale>("lcu_request", {method: "get", path: "/riotclient/region-locale"}).then(region_data => {
			supabase.functions.invoke<DatabaseData>("get-user", { body: { riot_id: `${summoner_data.gameName}#${summoner_data.tagLine}`, region: region_data.region.toLowerCase() } }).then(database_data => {
				console.log("supabase data", database_data);
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

	return (
		<div className="container">
			<PageComponent />
		</div>
	);
}