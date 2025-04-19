import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { LCUData } from "@/data_context.tsx";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function challenge_icon(lcu_challenge_data: LCUData, id: number, level: string | null = null) {
	if (id < 10 || lcu_challenge_data[id] === undefined || lcu_challenge_data[id].currentLevel === "NONE") {
		return "https://placehold.co/32?text=" + id;
	}
	return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/${lcu_challenge_data[id]?.levelToIconPath[level ?? lcu_challenge_data[id].currentLevel].substring(40).toLowerCase()}`;
}