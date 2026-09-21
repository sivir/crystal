import { createContext, createElement, useContext, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useAppStore } from "@/store";
import type { MasteryClassData, MasteryOptimalPaths } from "@/lib/optimal-path";
import { build_mastery_class_data, compute_optimal_paths } from "@/lib/optimal-path";

interface OptimalPathDataValue {
	class_data: MasteryClassData[];
	optimal_path: MasteryOptimalPaths | null;
	m7_path_ids: Set<number>;
}

// Stable empty references — never recreated, so consumers mounting
// before data loads share one identity instead of one Set per render.
const EMPTY_SET: Set<number> = new Set<number>();
const EMPTY_DATA_VALUE: OptimalPathDataValue = {
	class_data: [],
	optimal_path: null,
	m7_path_ids: EMPTY_SET,
};

const OptimalPathDataContext = createContext<OptimalPathDataValue>(EMPTY_DATA_VALUE);
const OptimalPathM10Context = createContext<Set<number>>(EMPTY_SET);

/** Reuse the previous Set when contents are identical (order-independent). */
function sets_equal(a: Set<number>, b: Set<number>): boolean {
	if (a === b) return true;
	if (a.size !== b.size) return false;
	for (const v of a) {
		if (!b.has(v)) return false;
	}
	return true;
}

export function OptimalPathProvider({ children }: { children: ReactNode }) {
	// Narrow selectors: only re-render when these specific slices change.
	// Previously useStaticData() re-rendered on *any* static_data change
	// (page nav, connected, eternals per-champion updates, loot, etc.).
	const lcu_data = useAppStore(state => state.static_data.lcu_data);
	const mastery_data = useAppStore(state => state.static_data.mastery_data);
	const champion_map = useAppStore(state => state.static_data.champion_map);
	const has_lcu_data = useAppStore(state => Object.keys(state.static_data.lcu_data).length > 0);

	// Keep previous Sets to preserve identity across recomputes with
	// identical contents (e.g. unrelated mastery points change that
	// doesn't alter the optimal selection).
	const prev_m7_ref = useRef<Set<number>>(EMPTY_SET);
	const prev_m10_ref = useRef<Set<number>>(EMPTY_SET);

	const { data_value, m10_ids } = useMemo(() => {
		if (!has_lcu_data) {
			return { data_value: EMPTY_DATA_VALUE, m10_ids: EMPTY_SET };
		}
		const class_data = build_mastery_class_data({ lcu_data, mastery_data, champion_map }, has_lcu_data);
		const optimal_path = compute_optimal_paths(class_data);
		const next_m7 = new Set(optimal_path?.m7.champions.map(champion => Number(champion.id)) ?? []);
		const next_m10 = new Set(optimal_path?.m10.champions.map(champion => Number(champion.id)) ?? []);

		// Stabilize: reuse old reference when contents didn't change so
		// hundreds of ChampionMasteryIcon consumers don't re-render.
		const m7_path_ids = sets_equal(prev_m7_ref.current, next_m7) ? prev_m7_ref.current : next_m7;
		const m10_path_ids = sets_equal(prev_m10_ref.current, next_m10) ? prev_m10_ref.current : next_m10;
		prev_m7_ref.current = m7_path_ids;
		prev_m10_ref.current = m10_path_ids;

		return { data_value: { class_data, optimal_path, m7_path_ids }, m10_ids: m10_path_ids };
	}, [has_lcu_data, lcu_data, mastery_data, champion_map]);

	return createElement(
		OptimalPathDataContext.Provider,
		{ value: data_value },
		createElement(OptimalPathM10Context.Provider, { value: m10_ids }, children),
	);
}

export function useOptimalPath(): OptimalPathDataValue & { m10_path_ids: Set<number> } {
	const data = useContext(OptimalPathDataContext);
	const m10_path_ids = useContext(OptimalPathM10Context);
	// Preserve old shape for mastery.tsx so it needs no changes.
	return useMemo(() => ({ ...data, m10_path_ids }), [data, m10_path_ids]);
}

/** Returns the shared (identity-stable) Set of champion IDs on the M10 path. */
export function useOptimalPathIds(): Set<number> {
	return useContext(OptimalPathM10Context);
}

/** Per-champion boolean — preferred in lists to avoid re-rendering when unrelated ids change. */
export function useIsOnOptimalPath(champion_id: number): boolean {
	return useContext(OptimalPathM10Context).has(Number(champion_id));
}
