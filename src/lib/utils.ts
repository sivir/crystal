import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { invoke } from "@tauri-apps/api/core";
import { useData } from "@/data_context.tsx";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function challenge_icon(id: number, level: string | null = null) {
	const { data } = useData();
	if (id < 10 || data.lcu_data[id] === undefined || data.lcu_data[id].currentLevel === "NONE") {
		return "https://placehold.co/32?text=" + id;
	}
	return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/${data.lcu_data[id]?.levelToIconPath[level ?? data.lcu_data[id].currentLevel].substring(40).toLowerCase()}`;
}

export async function lcu_get_request<t>(path: string) {
	const x = await invoke<t>("lcu_request", { method: "get", path: path });
	console.log("get", path, x);
	return x;
}

export async function lcu_post_request<t>(path: string, body: any) {
	const x = await invoke<t>("lcu_request", { method: "post", path: path, body: body });
	console.log("post", path, x);
	return x;
}

export async function lcu_put_request<t>(path: string, body: any) {
	const x = await invoke<t>("lcu_request", { method: "put", path: path, body: body });
	console.log("put", path, x);
	return x;
}

export function champion_name(id: number) {
	const { data } = useData();
	return data.champion_map[id]?.name || `Champion ${id}`;
}