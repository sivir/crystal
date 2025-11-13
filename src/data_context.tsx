import React, { createContext, useContext, useEffect, useState } from "react";

export type page_name = "home" | "lobby" | "calendar" | "search" | "settings" | "debug";

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

export type DatabaseData = {
	riot_data: any;
	mastery_data: MasteryDataEntry[];
}

export type SummonerData = {
	tagLine: string;
	gameName: string;
}

export type RegionLocale = {
	region: string;
}

export type ChampionSummaryItem = {
	id: number;
	name: string;
	squarePortraitPath: string;
	roles: string[];
};

export type ChampionSummaryMap = {
	[id: number]: ChampionSummaryItem;
}

export type LCUData = {
	[id: number]: {
		name: string;
		currentValue: number;
		currentLevel: string;
		completedIds: number[];
		thresholds: {
			[key: string]: {
				value: number;
			}
		}
		levelToIconPath: {
			[key: string]: string;
		}
	}
}

export type ChampSelectPlayer = {
	assignedPosition: string;
	cellId: number;
	championId: number;
	championPickIntent: number;
	selectedSkinId: number;
	spell1Id: number;
	spell2Id: number;
	summonerId: number;
	team: number;
	wardSkinId: number;
}

export type ChampSelectSession = {
	actions: any[][];
	allowBattleBoost: boolean;
	allowDuplicatePicks: boolean;
	allowLockedEvents: boolean;
	allowRerolling: boolean;
	allowSkinSelection: boolean;
	benchChampions: {
		championId: number;
	}[];
	benchEnabled: boolean;
	boostableSkinCount: number;
	chatDetails: {
		chatRoomName: string;
		chatRoomPassword: string;
	};
	counter: number;
	gameId: number;
	hasSimultaneousBans: boolean;
	hasSimultaneousPicks: boolean;
	isCustomGame: boolean;
	isSpectating: boolean;
	localPlayerCellId: number;
	lockedEventIndex: number;
	myTeam: ChampSelectPlayer[];
	recoveryCounter: number;
	rerollsRemaining: number;
	skipChampionSelect: boolean;
	theirTeam: ChampSelectPlayer[];
	timer: {
		adjustedTimeLeftInPhase: number;
		internalNowInEpochMs: number;
		isInfinite: boolean;
		phase: string;
		totalTimeInPhase: number;
	};
	trades: any[];
}

export type GameflowSession = {
	phase: string;
	gameData?: {
		queue?: {
			gameMode?: string;
			id?: number;
		};
	};
}

export interface PageData {
	riot_data: any;
	lcu_data: LCUData;
	mastery_data: MasteryDataEntry[];
	champion_map: ChampionSummaryMap;
	page: page_name;
	connected: boolean;
	has_lcu_data: boolean;
	champ_select_session: ChampSelectSession | null;
	gameflow_session: GameflowSession | null;
}

const initial_page_data: PageData = {
	riot_data: null,
	lcu_data: {},
	mastery_data: [],
	champion_map: {},
	page: "home",
	connected: false,
	has_lcu_data: false,
	champ_select_session: null,
	gameflow_session: null,
};

const DataContext = createContext<{data: PageData, setData: React.Dispatch<React.SetStateAction<PageData>>}>({
	data: initial_page_data,
	setData: () => null,
});

export function DataProvider({children}: {children: React.ReactNode}) {
	const [data, setData] = useState<PageData>(initial_page_data);
	useEffect(() => {
		setData(prev => ({...prev, has_lcu_data: Object.keys(prev.lcu_data).length > 0}));
	}, [data.lcu_data]);
	return <DataContext.Provider value={{data, setData}}>{children}</DataContext.Provider>;
}

export function useData() {
	return useContext(DataContext);
}