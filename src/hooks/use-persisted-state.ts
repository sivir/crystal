import { useState, useEffect, useCallback, useRef } from "react";
import { load, Store } from "@tauri-apps/plugin-store";

let store_promise: Promise<Store> | null = null;
const key_subscribers = new Map<string, Set<(value: unknown) => void>>();

function get_store(): Promise<Store> {
	if (!store_promise) {
		store_promise = load("ui-state.json", { autoSave: true, defaults: {} });
	}
	return store_promise;
}

function subscribe_to_key(key: string, subscriber: (value: unknown) => void) {
	let subscribers = key_subscribers.get(key);
	if (!subscribers) {
		subscribers = new Set();
		key_subscribers.set(key, subscribers);
	}

	subscribers.add(subscriber);

	return () => {
		const current_subscribers = key_subscribers.get(key);
		if (!current_subscribers) {
			return;
		}

		current_subscribers.delete(subscriber);
		if (current_subscribers.size === 0) {
			key_subscribers.delete(key);
		}
	};
}

function notify_key_subscribers<T>(key: string, value: T) {
	key_subscribers.get(key)?.forEach((subscriber) => subscriber(value));
}

export function usePersistedState<T>(key: string, default_value: T): [T, (value: T | ((prev: T) => T)) => void] {
	const [value, set_value] = useState<T>(default_value);
	const initialized = useRef(false);
	const current_value = useRef(value);

	useEffect(() => {
		current_value.current = value;
	}, [value]);

	useEffect(() => {
		return subscribe_to_key(key, (next_value) => {
			set_value(next_value as T);
		});
	}, [key]);

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
		const next_value = value instanceof Function ? value(current_value.current) : value;
		current_value.current = next_value;
		set_value(next_value);
		notify_key_subscribers(key, next_value);
	}, [key]);

	return [value, setPersistedState];
}

