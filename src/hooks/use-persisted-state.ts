import { useState, useEffect, useCallback, useRef } from "react";
import { load, Store } from "@tauri-apps/plugin-store";

let store_promise: Promise<Store> | null = null;

function get_store(): Promise<Store> {
	if (!store_promise) {
		store_promise = load("ui-state.json", { autoSave: true, defaults: {} });
	}
	return store_promise;
}

export function usePersistedState<T>(key: string, default_value: T): [T, (value: T | ((prev: T) => T)) => void] {
	const [value, set_value] = useState<T>(default_value);
	const initialized = useRef(false);

	// load initial value from store
	useEffect(() => {
		let mounted = true;

		get_store().then(async (store) => {
			if (!mounted) return;

			const stored_value = await store.get<T>(key);
			if (mounted && stored_value !== undefined && stored_value !== null) {
				set_value(stored_value);
			}
			if (mounted) {
				initialized.current = true;
			}
		}).catch((error) => {
			console.error(`Failed to load persisted state for key "${key}":`, error);
			if (mounted) {
				initialized.current = true;
			}
		});

		return () => {
			mounted = false;
		};
	}, [key]);

	// save value to store
	useEffect(() => {
		if (!initialized.current) return;

		get_store().then(async (store) => {
			await store.set(key, value);
		}).catch((error) => {
			console.error(`Failed to save persisted state for key "${key}":`, error);
		});
	}, [key, value]);

	const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
		set_value(value);
	}, []);

	return [value, setPersistedState];
}

