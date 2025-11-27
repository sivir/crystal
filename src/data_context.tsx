import React, { createContext, useContext, useState, useMemo } from "react";

export type page_name = "home" | "lobby" | "profile" | "skins" | "eternals" | "team_builder" | "settings" | "debug" | "user";

export type APIMasteryDataEntry = {
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

export type APIDatabaseData = {
	riot_data: any;
	mastery_data: APIMasteryDataEntry[];
}

export type APISummonerData = {
	tagLine: string;
	gameName: string;
}

export type APIRegionLocale = {
	region: string;
}

export type APIChampionSummary = {
	id: number;
	name: string;
	squarePortraitPath: string;
	roles: string[];
};

export type APIChampionSummaryMap = {
	[id: number]: APIChampionSummary;
}

export type APISkinMetadata = {
	id: number;
	isBase: boolean;
	name: string;
	rarity: string;
	isLegacy: boolean;
};

export type APISkinMetadataMap = {
	[id: number]: APISkinMetadata;
}

export type APIStatstone = {
	name: string;
	contentId: string;
	itemId: number;
	isRetired: boolean;
	trackingType: number;
	isEpic: boolean;
	description: string;
	milestones: number[];
	boundChampion: {
		itemId: number;
		inventoryType: string;
		contentId: string;
	};
	category: string;
	iconUnowned: string;
	iconUnlit: string;
	iconLit: string;
	iconFull: string;
};

export type APIStatstoneSet = {
	name: string;
	itemId: number;
	inventoryType: string;
	contentId: string;
	statstones: APIStatstone[];
};

export type APIStatstonesData = {
	statstoneData: APIStatstoneSet[];
};

export type StatstonesMap = {
	[item_id: string]: APIStatstoneSet;
}

export type APILCUChallenge = {
	name: string;
	id: number;
	category: string;
	description: string;
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
	pointsAwarded: number;
	idListType: string;
	isCapstone: boolean;
	capstoneGroupName: string;
	availableIds: number[];
}

export type APILCUChallengeMap = {
	[id: number]: APILCUChallenge;
}

export type APIChampSelectPlayer = {
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

export type APIChampSelectSession = {
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
	myTeam: APIChampSelectPlayer[];
	recoveryCounter: number;
	rerollsRemaining: number;
	skipChampionSelect: boolean;
	theirTeam: APIChampSelectPlayer[];
	timer: {
		adjustedTimeLeftInPhase: number;
		internalNowInEpochMs: number;
		isInfinite: boolean;
		phase: string;
		totalTimeInPhase: number;
	};
	trades: any[];
}

export type APIGameflowSession = {
	phase: string;
	gameData?: {
		queue?: {
			gameMode?: string;
			id?: number;
		};
	};
}

export type APIRiotData = {
	totalPoints: {
		current: number;
		level: string;
		max: number;
		position: number;
	},
	preferences: {
		challengeIds: number[];
	},
	challenges: {
		challengeId: number;
		level: string;
		value: number;
	}[]
}

const default_riot_challenge_data: APIRiotData = {
	totalPoints: {
		current: 0,
		level: "CHALLENGER",
		max: 0,
		position: 0
	},
	preferences: {
		challengeIds: []
	},
	challenges: []
};

export interface StaticData {
	riot_data: APIRiotData;
	lcu_data: APILCUChallengeMap;
	mastery_data: APIMasteryDataEntry[];
	champion_map: APIChampionSummaryMap;
	skin_map: APISkinMetadataMap;
	statstones_map: StatstonesMap;
	page: page_name;
	connected: boolean;
}

interface SessionData {
	champ_select_session: APIChampSelectSession | null;
	gameflow_session: APIGameflowSession | null;
}

const initial_page_data: StaticData = {
	riot_data: default_riot_challenge_data,
	lcu_data: {},
	mastery_data: [],
	champion_map: {},
	skin_map: {},
	statstones_map: {},
	page: "home",
	connected: false,
};

const initial_session_data: SessionData = {
	champ_select_session: null,
	gameflow_session: null,
};

const StaticDataContext = createContext<{ static_data: StaticData, setStaticData: React.Dispatch<React.SetStateAction<StaticData>> }>({
	static_data: initial_page_data,
	setStaticData: () => null,
});

const SessionDataContext = createContext<{ session_data: SessionData, setSessionData: React.Dispatch<React.SetStateAction<SessionData>> }>({
	session_data: initial_session_data,
	setSessionData: () => null,
});

export function StaticDataProvider({ children }: { children: React.ReactNode }) {
	const [static_data, setStaticData] = useState<StaticData>(initial_page_data);
	return <StaticDataContext.Provider value={{ static_data, setStaticData }}>{children}</StaticDataContext.Provider>;
}

export function SessionDataProvider({ children }: { children: React.ReactNode }) {
	const [session_data, setSessionData] = useState<SessionData>(initial_session_data);
	return <SessionDataContext.Provider value={{ session_data, setSessionData }}>{children}</SessionDataContext.Provider>;
}

export function useStaticData() {
	const context = useContext(StaticDataContext);
	const has_lcu_data = useMemo(() => Object.keys(context.static_data.lcu_data).length > 0, [context.static_data.lcu_data]);
	return { ...context, has_lcu_data };
}

export function useSessionData() {
	return useContext(SessionDataContext);
}