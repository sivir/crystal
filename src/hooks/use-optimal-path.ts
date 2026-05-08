import { createContext, createElement, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useStaticData } from "@/data_context";
import type { MasteryClassData, MasteryOptimalPaths } from "@/lib/optimal-path";
import { build_mastery_class_data, compute_optimal_paths } from "@/lib/optimal-path";

interface OptimalPathContextValue {
	class_data: MasteryClassData[];
	optimal_path: MasteryOptimalPaths | null;
	m10_path_ids: Set<number>;
}

const empty_value: OptimalPathContextValue = {
	class_data: [],
	optimal_path: null,
	m10_path_ids: new Set<number>(),
};

const OptimalPathContext = createContext<OptimalPathContextValue>(empty_value);

export function OptimalPathProvider({ children }: { children: ReactNode }) {
	const { static_data, has_lcu_data } = useStaticData();
	const value = useMemo(() => {
		const class_data = build_mastery_class_data(static_data, has_lcu_data);
		const optimal_path = compute_optimal_paths(class_data);
		const m10_path_ids = new Set(optimal_path?.m10.champions.map(champion => champion.id) ?? []);
		return { class_data, optimal_path, m10_path_ids };
	}, [has_lcu_data, static_data.lcu_data, static_data.mastery_data, static_data.champion_map]);

	return createElement(OptimalPathContext.Provider, { value }, children);
}

export function useOptimalPath() {
	return useContext(OptimalPathContext);
}

/** Returns the shared Set of champion IDs on the optimal M10 path to Master tier. */
export function useOptimalPathIds(): Set<number> {
	return useOptimalPath().m10_path_ids;
}
