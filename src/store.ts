import { create } from "zustand";
import type { StaticData, SessionData } from "@/data_context";

const default_riot_challenge_data = {
	totalPoints: { current: 0, level: "CHALLENGER", max: 0, position: 0 },
	preferences: { challengeIds: [] },
	challenges: [],
};

export const initial_page_data: StaticData = {
	riot_data: default_riot_challenge_data,
	lcu_data: {},
	mastery_data: [],
	champion_map: {},ake 
	skin_map: {},
	statstones_map: {},
	eternals_map: new Map(),
	page: "home",
	connected: false,
	loot_data: {},
	minimal_skins: [],
	last_update_time: null,
};

export const initial_session_data: SessionData = {
	champ_select_session: null,
	gameflow_session: null,
	lobby_member_puuids: [],
};

interface AppState {
	static_data: StaticData;
	session_data: SessionData;
	setStaticData: (updater: StaticData | ((prev: StaticData) => StaticData)) => void;
	setSessionData: (updater: SessionData | ((prev: SessionData) => SessionData)) => void;
}

export const useAppStore = create<AppState>((set) => ({
	static_data: initial_page_data,
	session_data: initial_session_data,
	setStaticData: (updater) => set((state) => ({
		static_data: typeof updater === "function" ? updater(state.static_data) : updater,
	})),
	setSessionData: (updater) => set((state) => ({
		session_data: typeof updater === "function" ? updater(state.session_data) : updater,
	})),
}));
