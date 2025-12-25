import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { invoke } from "@tauri-apps/api/core";
import { createClient } from "@supabase/supabase-js";
import { APIChampionSummaryMap, APILCUChallenge, APILCUChallengeMap } from "@/data_context";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const SUPABASE_URL = "https://jvnhtmgsncslprdrnkth.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bmh0bWdzbmNzbHByZHJua3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQ2Mjc4ODMsImV4cCI6MjAxMDIwMzg4M30.OOjwsPjGHEc-x8MlhrOX64tJTNENqKqEq2635HKErrk";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function supabase_invoke<t>(function_name: string, body: any) {
	return await supabase.functions.invoke<t>(function_name, { body: body, headers: { "x-secret": import.meta.env.VITE_SUPABASE_SECRET } });
}

export const levels = ["NONE", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

export function challenge_icon(challenge: APILCUChallenge, id: number | null = null) {
	if (challenge == undefined || challenge.id < 10) {
		return "https://placehold.co/32?text=" + id;
	}
	let level = challenge.currentLevel;
	if (level == "NONE") {
		for (let i = 0; i < levels.length; i++) {
			if (challenge.levelToIconPath[levels[i]]) {
				level = levels[i];
				break;
			}
		}
	}
	return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/${challenge.levelToIconPath[level].substring(40).toLowerCase()}`;
}

export type SortDirection = "asc" | "desc";

export async function lcu_get_request<t>(path: string) {
	return await invoke<t>("lcu_request", { method: "get", path: path }).catch((e) => {
		console.log("lcu_get_request failed: " + path);
		throw e;
	});
}

export async function lcu_post_request<t>(path: string, body: any) {
	return await invoke<t>("lcu_request", { method: "post", path: path, body: body }).catch((e) => {
		console.log("lcu_post_request failed: " + path);
		throw e;
	});
}

export async function lcu_put_request<t>(path: string, body: any) {
	return await invoke<t>("lcu_request", { method: "put", path: path, body: body }).catch((e) => {
		console.log("lcu_put_request failed: " + path);
		throw e;
	});
}

export function champion_name(id: number, champion_map: APIChampionSummaryMap) {
	return champion_map[id]?.name || `Champion ${id}`;
}

export const classes = ["Assassin", "Fighter", "Mage", "Marksman", "Support", "Tank"];

// Mastery level colors for badges
export const mastery_colors: { [key: number]: string } = {
	10: "bg-red-500 hover:bg-red-600 text-white border-transparent",
	9: "bg-orange-500 hover:bg-orange-600 text-white border-transparent",
	8: "bg-purple-500 hover:bg-purple-600 text-white border-transparent",
	7: "bg-blue-500 hover:bg-blue-600 text-white border-transparent",
	6: "bg-green-500 hover:bg-green-600 text-white border-transparent",
	5: "bg-gray-500 hover:bg-gray-600 text-white border-transparent"
};

// Mastery level colors for icons (without hover/border states)
export const mastery_icon_colors: { [key: number]: string } = {
	10: "bg-red-500",
	9: "bg-orange-500",
	8: "bg-purple-500",
	7: "bg-blue-500",
	6: "bg-green-500",
	5: "bg-gray-500"
};

export function mastery_color(level: number): string {
	if (level >= 10) {
		return mastery_colors[10];
	}
	return mastery_colors[level] || "";
}

export function mastery_icon_color(level: number): string {
	if (level >= 10) {
		return mastery_icon_colors[10];
	}
	return mastery_icon_colors[level] || "bg-gray-500";
}

export const globetrotter_regions: { [key: number]: string } = {
	303501: "Bandle City",
	303502: "Bilgewater",
	303503: "Demacia",
	303504: "Freljord",
	303505: "Ionia",
	303506: "Ixtal",
	303507: "Noxus",
	303508: "Piltover",
	303509: "Shadow Isles",
	303510: "Shurima",
	303511: "Targon",
	303512: "Void",
	303513: "Zaun",
};

export const regions = Object.values(globetrotter_regions);

export function get_champion_region(champion_id: number, lcu_data: APILCUChallengeMap): string | null {
	for (const [challenge_id, region_name] of Object.entries(globetrotter_regions)) {
		const challenge = lcu_data[parseInt(challenge_id)];
		if (challenge && challenge.availableIds.includes(champion_id)) {
			return region_name;
		}
	}
	return null;
}