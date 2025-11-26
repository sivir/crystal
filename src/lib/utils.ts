import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { invoke } from "@tauri-apps/api/core";
import { createClient } from "@supabase/supabase-js";
import { APIChampionSummaryMap, APILCUChallengeMap } from "@/data_context";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const SUPABASE_URL = "https://jvnhtmgsncslprdrnkth.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2bmh0bWdzbmNzbHByZHJua3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTQ2Mjc4ODMsImV4cCI6MjAxMDIwMzg4M30.OOjwsPjGHEc-x8MlhrOX64tJTNENqKqEq2635HKErrk";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function supabase_invoke<t>(function_name: string, body: any) {
	return await supabase.functions.invoke<t>(function_name, { body: body, headers: { "x-secret": import.meta.env.VITE_SUPABASE_SECRET } });
}

export function challenge_icon(lcu_data: APILCUChallengeMap, id: number, level: string | null = null) {
	if (id < 10 || lcu_data[id] === undefined || lcu_data[id].currentLevel === "NONE") {
		return "https://placehold.co/32?text=" + id;
	}
	return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/${lcu_data[id]?.levelToIconPath[level ?? lcu_data[id].currentLevel].substring(40).toLowerCase()}`;
}

export type SortDirection = "asc" | "desc";

export async function lcu_get_request<t>(path: string) {
	return await invoke<t>("lcu_request", { method: "get", path: path });
}

export async function lcu_post_request<t>(path: string, body: any) {
	return await invoke<t>("lcu_request", { method: "post", path: path, body: body });
}

export async function lcu_put_request<t>(path: string, body: any) {
	return await invoke<t>("lcu_request", { method: "put", path: path, body: body });
}

export function champion_name(id: number, champion_map: APIChampionSummaryMap) {
	return champion_map[id]?.name || `Champion ${id}`;
}

export const classes = ["Tank", "Support", "Mage", "Assassin", "Fighter", "Marksman"];