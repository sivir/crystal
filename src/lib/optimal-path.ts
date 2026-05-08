import type { APILCUChallenge, APIMasteryDataEntry, StaticData } from "@/data_context";
import { default_mastery_data } from "@/data_context";
import { M7_CHALLENGES as m7_challenges, M10_CHALLENGES as m10_challenges } from "@/lib/challenges";
import { classes } from "@/lib/utils";

export type OptimalPathTarget = "M7" | "M10";

export interface MasteryChallengeInfo {
	current: number;
	next_threshold: number;
	master_threshold: number;
}

export interface MasteryClassChampion {
	id: number;
	name: string;
	mastery_level: number;
	mastery_points: number;
	points_to_m7: number;
	points_to_m10: number;
	mastery: APIMasteryDataEntry;
}

export type ClassChallengeProgress =
	| { possible: true; total: number; selected_ids: number[]; champions_needed: number; available: number }
	| { possible: false; total: number; champions_needed: number; available: number; selected_ids?: undefined };

export interface MasteryClassData {
	class_name: string;
	m7_challenge: APILCUChallenge;
	m10_challenge: APILCUChallenge;
	m7_info: MasteryChallengeInfo;
	m10_info: MasteryChallengeInfo;
	m7_progress: ClassChallengeProgress;
	m7_master: ClassChallengeProgress;
	m10_progress: ClassChallengeProgress;
	m10_master: ClassChallengeProgress;
	champions: MasteryClassChampion[];
	closest_type: OptimalPathTarget;
}

export interface OptimalPathClassNeed {
	class_name: string;
	remaining: number;
	original_remaining: number;
	impossible: boolean;
	eligible_ids: Set<number>;
	total_in_class: number;
}

export interface OptimalPathChampion extends MasteryClassChampion {
	classes_contributed: string[];
	higher_than_all: boolean;
	points_needed: number;
}

export interface OptimalPathResult {
	champions: OptimalPathChampion[];
	total_points: number;
	total_champions: number;
	dual_class_count: number;
	class_needs: OptimalPathClassNeed[];
	impossible_classes: string[];
}

export interface MasteryOptimalPaths {
	m7: OptimalPathResult;
	m10: OptimalPathResult;
}

const mastery_per_level = [0, 1800, 4200, 6600, 9000, 10000, 11000, 11000, 11000];

export function points_to_target_level(current_level: number, current_points_until_next: number, target_level: number) {
	if (current_level >= target_level) return 0;
	let points = current_points_until_next;
	for (let level = current_level + 1; level < target_level; level++) {
		points += mastery_per_level[level] || 11000;
	}
	return points;
}

function get_thresholds(challenge: APILCUChallenge): MasteryChallengeInfo {
	const thresholds = Object.values(challenge.thresholds).map(threshold => threshold.value).sort((a, b) => a - b);
	const current = challenge.currentValue;
	const next_threshold = thresholds.find(threshold => threshold > current) ?? thresholds[thresholds.length - 1] ?? current;
	const master_threshold = challenge.thresholds["MASTER"]?.value ?? thresholds[thresholds.length - 1] ?? current;
	return { current, next_threshold, master_threshold };
}

function calc_totals(champions: MasteryClassChampion[], points_key: "points_to_m7" | "points_to_m10", current: number, target: number): ClassChallengeProgress {
	const needed = Math.max(0, target - current);
	const eligible = champions.filter(champion => champion[points_key] > 0).sort((a, b) => a[points_key] - b[points_key]);
	if (eligible.length < needed) {
		return { possible: false, total: 0, champions_needed: needed, available: eligible.length };
	}
	const selected = eligible.slice(0, needed);
	const total = selected.reduce((sum, champion) => sum + champion[points_key], 0);
	return { possible: true, total, selected_ids: selected.map(champion => champion.id), champions_needed: needed, available: eligible.length };
}

export function build_mastery_class_data(static_data: StaticData, has_lcu_data: boolean): MasteryClassData[] {
	if (!has_lcu_data) return [];

	const mastery_by_champion = new Map(static_data.mastery_data.map(mastery => [mastery.championId, mastery]));

	return classes.map((class_name, index) => {
		const m7_challenge = static_data.lcu_data[m7_challenges[index]];
		const m10_challenge = static_data.lcu_data[m10_challenges[index]];
		if (!m7_challenge || !m10_challenge) return null;

		const champions = (m7_challenge.availableIds || []).filter(id => id <= 3000).map(id => {
			const champ = static_data.champion_map[id];
			const mastery = mastery_by_champion.get(id) || { ...default_mastery_data, championId: id };
			const points_to_m7 = points_to_target_level(mastery.championLevel, mastery.championPointsUntilNextLevel, 7);
			const points_to_m10 = points_to_target_level(mastery.championLevel, mastery.championPointsUntilNextLevel, 10);

			return {
				id,
				name: champ?.name || `Champion ${id}`,
				mastery_level: mastery.championLevel,
				mastery_points: mastery.championPoints,
				points_to_m7,
				points_to_m10,
				mastery,
			};
		});

		champions.sort((a, b) => a.mastery_level !== b.mastery_level ? b.mastery_level - a.mastery_level : b.mastery_points - a.mastery_points);

		const m7_info = get_thresholds(m7_challenge);
		const m10_info = get_thresholds(m10_challenge);
		const m7_progress = calc_totals(champions, "points_to_m7", m7_info.current, m7_info.next_threshold);
		const m7_master = calc_totals(champions, "points_to_m7", m7_info.current, m7_info.master_threshold);
		const m10_progress = calc_totals(champions, "points_to_m10", m10_info.current, m10_info.next_threshold);
		const m10_master = calc_totals(champions, "points_to_m10", m10_info.current, m10_info.master_threshold);
		const closest_type = (m7_progress.possible ? m7_progress.total : Infinity) <= (m10_progress.possible ? m10_progress.total : Infinity) ? "M7" : "M10";

		return { class_name, m7_challenge, m10_challenge, m7_info, m10_info, m7_progress, m7_master, m10_progress, m10_master, champions, closest_type };
	}).filter((data): data is MasteryClassData => data !== null);
}

export function compute_optimal_paths(class_data: MasteryClassData[]): MasteryOptimalPaths | null {
	if (class_data.length === 0) return null;
	return { m7: compute_path(class_data, "M7"), m10: compute_path(class_data, "M10") };
}

function compute_path(class_data: MasteryClassData[], target: OptimalPathTarget): OptimalPathResult {
	const points_key = target === "M7" ? "points_to_m7" : "points_to_m10";
	const class_needs: OptimalPathClassNeed[] = [];
	const champ_map = new Map<number, { data: MasteryClassChampion; class_indices: Set<number>; points: number }>();

	class_data.forEach((class_item, index) => {
		const info = target === "M7" ? class_item.m7_info : class_item.m10_info;
		const original_remaining = Math.max(0, info.master_threshold - info.current);
		const eligible = class_item.champions.filter(champion => champion[points_key] > 0);
		const impossible = eligible.length < original_remaining;
		class_needs.push({
			class_name: class_item.class_name,
			remaining: Math.min(original_remaining, eligible.length),
			original_remaining,
			impossible,
			eligible_ids: new Set(eligible.map(champion => champion.id)),
			total_in_class: class_item.champions.length,
		});

		eligible.forEach(champion => {
			if (!champ_map.has(champion.id)) champ_map.set(champion.id, { data: champion, class_indices: new Set(), points: champion[points_key] });
			champ_map.get(champion.id)!.class_indices.add(index);
		});
	});

	const remaining = class_needs.map(class_need => class_need.remaining);
	const selected_ids = new Set<number>();
	const selection_order: number[] = [];
	const add_champion = (champion_id: number) => {
		if (selected_ids.has(champion_id)) return;
		selected_ids.add(champion_id);
		selection_order.push(champion_id);
		champ_map.get(champion_id)!.class_indices.forEach(class_index => {
			remaining[class_index] = Math.max(0, remaining[class_index] - 1);
		});
	};

	class_needs.forEach(class_need => {
		if (class_need.impossible) class_need.eligible_ids.forEach(add_champion);
	});

	while (remaining.some(class_remaining => class_remaining > 0)) {
		let best_id: number | null = null;
		let best_score = -Infinity;
		for (const [champion_id, info] of champ_map) {
			if (selected_ids.has(champion_id)) continue;
			let coverage = 0;
			info.class_indices.forEach(class_index => { if (remaining[class_index] > 0) coverage++; });
			if (coverage === 0) continue;
			const score = coverage / Math.max(info.points, 1);
			if (score > best_score || (score === best_score && best_id !== null && info.points < champ_map.get(best_id)!.points)) {
				best_score = score;
				best_id = champion_id;
			}
		}
		if (best_id === null) break;
		add_champion(best_id);
	}

	const champions = selection_order.map(champion_id => {
		const info = champ_map.get(champion_id)!;
		const classes_contributed = [...info.class_indices].map(class_index => class_data[class_index].class_name);
		const higher_than_all = [...info.class_indices].every(class_index =>
			!class_data[class_index].champions
				.filter(champion => champion[points_key] > 0 && !selected_ids.has(champion.id))
				.some(champion => champion.mastery_points > info.data.mastery_points)
		);
		return { ...info.data, classes_contributed, higher_than_all, points_needed: info.points };
	}).sort((a, b) => b.mastery_points - a.mastery_points);

	return {
		champions,
		total_points: champions.reduce((sum, champion) => sum + champion.points_needed, 0),
		total_champions: champions.length,
		dual_class_count: champions.filter(champion => champion.classes_contributed.length > 1).length,
		class_needs,
		impossible_classes: class_needs.filter(class_need => class_need.impossible).map(class_need => class_need.class_name),
	};
}