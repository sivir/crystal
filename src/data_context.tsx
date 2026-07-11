import { useMemo } from "react";
import { useAppStore } from "@/store";

export type page_name = "home" | "mastery" | "lobby" | "profile" | "skins" | "eternals" | "team_builder" | "settings" | "debug" | "user";

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

export const default_mastery_data: APIMasteryDataEntry = {
	championId: 0,
	championLevel: 0,
	championPoints: 0,
	championPointsSinceLastLevel: 0,
	championPointsUntilNextLevel: 0,
	markRequiredForNextLevel: 0,
	milestoneGrades: [],
	nextSeasonMilestone: {
		requireGradeCounts: {}
	},
	tokensEarned: 0
}

export type APIDatabaseData = {
	riot_id?: string;
	riot_data: any;
	mastery_data: APIMasteryDataEntry[];
	summoner_data?: any;
}

export type APISummonerData = {
	tagLine: string;
	gameName: string;
	summonerId: string;
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
	parentId: number;
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

type APIChampSelectTrade = {
	cellId: number;
	id: number;
	status: string;
};

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
	trades: APIChampSelectTrade[];
}

export type APILobbyMember = {
	puuid: string;
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

export type APIMinimalSkin = {
	championId: number;
	id: number;
	isBase: boolean;
	ownership: {
		owned: boolean;
	};
};

export type APILootData = {
	playerLoot: {
		[id: string]: {
			parentStoreItemId: number;
			storeItemId: number;
			upgradeEssenceValue?: number;
		};
	};
};



export type APIEternalsSeries = {
	itemId: number;
	name: string;
	statstones: {
		description: string;
		formattedValue: string;
		isRetired: boolean;
		name: string;
		playerRecord?: {
			value: number;
		};
		statstoneId: string;
	}[];
	stonesOwned: number;
};

export type APIEternalsData = APIEternalsSeries[];

export interface StaticData {
	riot_data: APIRiotData;
	lcu_data: APILCUChallengeMap;
	mastery_data: APIMasteryDataEntry[];
	champion_map: APIChampionSummaryMap;
	skin_map: APISkinMetadataMap;
	statstones_map: StatstonesMap;
	eternals_map: Map<number, APIEternalsData>;
	page: page_name;
	connected: boolean;
	loot_data: {
		[id: string]: {
			parentStoreItemId: number;
			storeItemId: number;
			upgradeEssenceValue?: number;
		};
	};
	minimal_skins: APIMinimalSkin[];
	last_update_time: number | null;
}

export interface SessionData {
	champ_select_session: APIChampSelectSession | null;
	gameflow_session: APIGameflowSession | null;
	lobby_member_puuids: string[];
}

export function useStaticData() {
	const static_data = useAppStore(state => state.static_data);
	const setStaticData = useAppStore(state => state.setStaticData);
	const has_lcu_data = useMemo(() => Object.keys(static_data.lcu_data).length > 0, [static_data.lcu_data]);
	return { static_data, setStaticData, has_lcu_data };
}

export function useSessionData() {
	const session_data = useAppStore(state => state.session_data);
	const setSessionData = useAppStore(state => state.setSessionData);
	return { session_data, setSessionData };
}