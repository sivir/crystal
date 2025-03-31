import React, { lazy, useEffect } from "react";
import "./App.css";
import { listen } from "@tauri-apps/api/event";
import { ChampionSummaryItem, LCUData, MasteryDataEntry, useData } from "@/data_context.tsx";
import { invoke } from "@tauri-apps/api/core";
import { page_name, PageData } from "@/data_context.tsx";

const Champions = lazy(() => import("@/pages/champions.tsx"));
const Debug = lazy(() => import("@/pages/debug.tsx"));

const page_components: Record<page_name, React.ComponentType> = {
	"home": Champions,
	"inbox": Champions,
	"calendar": Champions,
	"search": Champions,
	"settings": Champions,
	"debug": Debug,
}

export function refresh_data(setData: React.Dispatch<React.SetStateAction<PageData>>) {
	invoke<LCUData>("lcu_get_request", {path: "/lol-challenges/v1/challenges/local-player"}).then(x => {
		console.log("/lol-challenges/v1/challenges/local-player", x);
		setData(prev => ({...prev, lcu_data: x}));
	});
	invoke<MasteryDataEntry[]>("lcu_get_request", {path: "/lol-champion-mastery/v1/local-player/champion-mastery"}).then(x => {
		console.log("/lol-champion-mastery/v1/local-player/champion-mastery", x);
		setData(prev => ({...prev, mastery_data: x}));
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