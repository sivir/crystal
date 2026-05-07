import { useStaticData } from "@/data_context.tsx";
import { useLoading } from "@/lib/loading_state";
import { useTheme } from "@/theme-provider.tsx";
import { refresh_data, refresh_eternals } from "@/App.tsx";
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

import { Moon, Sun, RefreshCcw, Flame } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Separator } from "@/components/ui/separator.tsx";

function ModeToggle() {
	const { setTheme, theme } = useTheme()

	return (
		<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
			<Sun className="h-3 w-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute h-3 w-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	)
}

export function StatusBar() {
	const { static_data, setStaticData } = useStaticData();
	const { is_loading, loading_progress } = useLoading();
	const [version, setVersion] = useState<string>("");

	useEffect(() => {
		getVersion().then(x => setVersion(x));
	}, []);

	return (
		<footer className="relative flex h-8 items-center justify-between px-3 border-t bg-background/80 backdrop-blur-sm text-xs text-muted-foreground select-none shrink-0">
			{/* Loading progress bar — sits at the very top of the footer */}
			{is_loading && (
				<div className="absolute top-0 left-0 right-0">
					<Progress value={loading_progress} className="h-[2px] rounded-none" />
				</div>
			)}

			{/* Left section: connection status */}
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1.5">
					<div className={`h-2 w-2 rounded-full ${static_data.connected ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"}`} />
					<span className={static_data.connected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
						{static_data.connected ? "Connected" : "Disconnected"}
					</span>
				</div>
			</div>

			{/* Right section: actions + version */}
			<div className="flex items-center gap-1.5">
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={() => refresh_data(setStaticData, static_data)}
					title="Refresh data"
				>
					<RefreshCcw className={`h-3 w-3 ${is_loading ? "animate-spin" : ""}`} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6"
					onClick={() => refresh_eternals(setStaticData, static_data)}
					title="Refresh Eternals"
				>
					<Flame className={`h-3 w-3 ${is_loading ? "text-orange-400" : ""}`} />
				</Button>
				<ModeToggle />
				<Separator orientation="vertical" className="h-4 mx-0.5" />
				<span className="text-muted-foreground/60 tabular-nums">v{version}</span>
			</div>
		</footer>
	);
}
