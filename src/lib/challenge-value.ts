import type { APILCUChallenge } from "@/data_context";
import type { MasteryClassData, ClassChallengeProgress } from "@/lib/optimal-path";
import { levels, is_standard_champion, is_classic_champion } from "@/lib/utils";

/** Cheapest-first selection mirroring calc_totals in lib/optimal-path. */
export function select_cheapest<T extends { id: number }>(
	pool: T[],
	cost_fn: (c: T) => number,
	needed: number,
): ClassChallengeProgress {
	const eligible = pool.filter(c => cost_fn(c) > 0).sort((a, b) => cost_fn(a) - cost_fn(b));
	if (needed <= 0) return { possible: true, total: 0, selected_ids: [], champions_needed: 0, available: eligible.length };
	if (eligible.length < needed) return { possible: false, total: 0, champions_needed: needed, available: eligible.length };
	const selected = eligible.slice(0, needed);
	return {
		possible: true,
		total: selected.reduce((sum, c) => sum + cost_fn(c), 0),
		selected_ids: selected.map(c => c.id),
		champions_needed: needed,
		available: eligible.length,
	};
}

/**
 * Whether a champion id is a real grind suggestion.
 * Drops: pure phantoms (no map entry, no mastery entry — e.g. test/mode
 * placeholder ids like 3147/66608 that Riot still lists in availableIds),
 * unplayed classic variants (separate queue you don't own), and odd ids
 * you have never played. Unplayed standard champs with map entries stay.
 */
export function is_grindable_champion(
	id: number,
	has_info: boolean,
	level: number,
	points: number,
): boolean {
	const played = level > 0 || points > 0;
	if (!has_info && !played) return false;
	if (is_classic_champion(id)) return played;
	if (is_standard_champion(id)) return true;
	return played;
}

// Challenge-points per tier for the mastery tracks.
export const TIER_POINTS: Record<string, number> = {
	NONE: 0, IRON: 5, BRONZE: 10, SILVER: 15, GOLD: 25, PLATINUM: 40,
	DIAMOND: 60, MASTER: 100,
};

export interface TrackValue {
	/** Fixed points-per-slot for the current tier (option-2). */
	per_slot: number;
	/** Slots left to the next tier (option-1 urgency signal). */
	remaining: number;
	/** Raw point delta for completing the tier. */
	delta: number;
}

/** Fixed value of one contributing champion for the track's current tier. Null when maxed. */
export function track_value(track: APILCUChallenge | undefined | null): TrackValue | null {
	if (!track) return null;
	const current_tier = track.currentLevel ?? "NONE";
	const current_idx = levels.indexOf(current_tier);
	const current_value = track.currentValue ?? 0;
	for (let i = current_idx + 1; i < levels.length; i++) {
		const tier = levels[i];
		const threshold = track.thresholds?.[tier]?.value;
		if (threshold == null || threshold <= current_value) continue;
		const floor = track.thresholds?.[current_tier]?.value ?? 0;
		const span = threshold - floor;
		const delta = (TIER_POINTS[tier] ?? 0) - (TIER_POINTS[current_tier] ?? 0);
		if (span <= 0 || delta <= 0) return null;
		return { per_slot: delta / span, remaining: threshold - current_value, delta };
	}
	return null;
}

export interface ChampionValuePart {
	cls: string;
	value: number;
	remaining: number;
	delta: number;
}

export interface ChampionValue {
	id: number;
	name: string;
	/** First contributing class (display only). */
	cls: string;
	/** Mastery points still needed to reach target. */
	cost: number;
	/** Summed option-2 challenge points. */
	value: number;
	/** Contributing tracks. */
	parts: ChampionValuePart[];
	/** True when in 2+ tracks. */
	dual: boolean;
	/** True when any contributing track is within 2 of its tier. */
	urgent: boolean;
}

/** Per-champion option-2 values over the class tracks for target. Capped at 120 cheapest. */
export function compute_champion_values(
	class_data: MasteryClassData[],
	target: "M7" | "M10",
): ChampionValue[] {
	const by_id = new Map<number, ChampionValue & { cls: string }>();
	for (const cls of class_data) {
		const track = target === "M7" ? cls.m7_challenge : cls.m10_challenge;
		const stats = track_value(track);
		if (!stats) continue;
		for (const champ of cls.champions) {
			const cost = target === "M7" ? champ.points_to_m7 : champ.points_to_m10;
			if (cost <= 0) continue;
			const prev = by_id.get(champ.id);
			if (prev) {
				prev.value += stats.per_slot;
				prev.dual = true;
				prev.cost = Math.min(prev.cost, cost);
				prev.urgent = prev.urgent || stats.remaining <= 2;
				prev.parts.push({ cls: cls.class_name, value: stats.per_slot, remaining: stats.remaining, delta: stats.delta });
			} else {
				by_id.set(champ.id, {
					id: champ.id, name: champ.name, cost, value: stats.per_slot, dual: false,
					cls: cls.class_name, urgent: stats.remaining <= 2,
					parts: [{ cls: cls.class_name, value: stats.per_slot, remaining: stats.remaining, delta: stats.delta }],
				});
			}
		}
	}
	return [...by_id.values()]
		.sort((a, b) => a.cost - b.cost)
		.slice(0, 120);
}
