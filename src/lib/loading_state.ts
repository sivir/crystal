import { useState, useEffect } from "react";

type Listener = (loading: boolean, progress: number) => void;

let is_loading = false;
let loading_progress = 0;
const listeners = new Set<Listener>();

export function setLoading(loading: boolean, progress: number) {
	is_loading = loading;
	loading_progress = progress;
	listeners.forEach(listener => listener(is_loading, loading_progress));
}

export function useLoading() {
	const [state, setState] = useState({ is_loading, loading_progress });

	useEffect(() => {
		const listener: Listener = (loading, progress) => {
			setState({ is_loading: loading, loading_progress: progress });
		};
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	return state;
}
