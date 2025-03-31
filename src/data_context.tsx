import React, { createContext, useContext, useState } from "react";

export type page_name = "home" | "inbox" | "calendar" | "search" | "settings" | "debug";

export type MasteryDataEntry = {
	championId: number;
	championLevel: number;
	championPoints: number;
	championPointsSinceLastLevel: number;
	championPointsUntilNextLevel: number;
	markRequiredForNextLevel: number;
	milestoneGrades: string[];
	nextSeasonMilestone: {
		requireGradeCounts: {
			[grade: string]: number;
		}
	},
	tokensEarned: number;
};

export type ChampionSummaryItem = {
	id: number;
	name: string;
	squarePortraitPath: string;
	roles: string[];
};

export type ChampionSummaryMap = {
	[id: number]: ChampionSummaryItem;
}

type LCUData = {
	[id: number]: {
		currentValue: number;
		thresholds: {
			[key: string]: {
				value: number;
			}
		}
	}
}

export interface PageData {
	riot_data: any;
	lcu_data: LCUData;
	mastery_data: MasteryDataEntry[];
	champion_map: ChampionSummaryMap;
	page: page_name;
	connected: boolean;
}

const initial_page_data: PageData = {
	riot_data: null,
	lcu_data: {},
	mastery_data: [],
	champion_map: {},
	page: "home",
	connected: false,
};

const DataContext = createContext<{data: PageData, setData: React.Dispatch<React.SetStateAction<PageData>>}>({
	data: initial_page_data,
	setData: () => null,
});

export function DataProvider({children}: {children: React.ReactNode}) {
	const [data, setData] = useState<PageData>(initial_page_data);
	return <DataContext.Provider value={{data, setData}}>{children}</DataContext.Provider>;
}

export function useData() {
	return useContext(DataContext);
}