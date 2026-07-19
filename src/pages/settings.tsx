import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useEffect, useState } from "react";
import { Github, MessageCircle } from "lucide-react";

export default function Settings() {
	const [close_button_exits_app, set_close_button_exits_app] = usePersistedState<boolean>("settings.close_button_exits_app", false);
	const [aram_queues, set_aram_queues] = usePersistedState<number[]>("settings.aram_queues", [450, 2400]);
	const [arena_queues, set_arena_queues] = usePersistedState<number[]>("settings.arena_queues", [1700, 1740, 1750]);
	const [other_queues, set_other_queues] = usePersistedState<number[]>("settings.other_random_queues", [900]);
	const [version, set_version] = useState<string>("");
	const [checking, set_checking] = useState<boolean>(false);
	const [latestVersion, set_latest_version] = useState<string | null>(null);
	const [update, set_update] = useState<{ version: string; downloadAndInstall: () => Promise<void> } | null>(null);
	const [installing, set_installing] = useState<boolean>(false);

	useEffect(() => {
		getVersion().then(v => set_version(v));
	}, []);

	const handleCheckUpdate = async () => {
		set_checking(true);
		set_latest_version(null);
		set_update(null);
		try {
			const result = await check();
			if (result) {
				set_latest_version(result.version);
				if (result.version !== version) {
					set_update({ version: result.version, downloadAndInstall: () => result.downloadAndInstall() });
				}
			} else {
				set_latest_version(version);
			}
		} catch (error) {
			console.error("Failed to check for updates:", error);
		} finally {
			set_checking(false);
		}
	};

	const handleDownloadInstall = async () => {
		if (!update) return;
		set_installing(true);
		try {
			await update.downloadAndInstall();
			await relaunch();
		} catch (error) {
			console.error("Failed to install update:", error);
			set_installing(false);
		}
	};

	return (
		<div className="p-4 space-y-4">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-base">
							<MessageCircle className="w-4 h-4" />
							Support & Feedback
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Message <span className="font-semibold text-foreground">cyanscars</span> on Discord for support, suggestions, and feedback!
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-base">
							<Github className="w-4 h-4" />
							Source Code
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Check out the project on GitHub for updates and source code.
						</p>
						<a
							href="https://github.com/sivir/crystal"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
						>
							github.com/sivir/crystal
						</a>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Updates</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm">Current Version: v{version}</p>
							{checking ? (
								<p className="text-xs text-muted-foreground">Checking for updates...</p>
							) : latestVersion ? (
								<p className="text-xs text-muted-foreground">
									{latestVersion === version ? "You are up to date!" : `Latest version: v${latestVersion}`}
								</p>
							) : (
								<p className="text-xs text-muted-foreground">Click below to check for updates.</p>
							)}
						</div>
						<Button size="sm" onClick={handleCheckUpdate} disabled={checking}>
							{checking ? "Checking..." : "Check"}
						</Button>
					</div>
					{update && (
						<Button size="sm" variant="default" onClick={handleDownloadInstall} disabled={installing} className="w-full mt-2">
							{installing ? "Installing..." : `Install v${update.version}`}
						</Button>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Behavior</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-start gap-3">
						<Checkbox
							id="close-button-exits-app"
							checked={close_button_exits_app}
							onCheckedChange={(checked) => set_close_button_exits_app(checked === true)}
						/>
						<div>
							<Label htmlFor="close-button-exits-app" className="cursor-pointer text-sm">
								Close button exits app
							</Label>
							<p className="text-xs text-muted-foreground">
								When disabled, clicking the close button hides Crystal to the system tray instead of fully closing it.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Queue IDs</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div>
						<Label className="text-sm">ARAM modes</Label>
						<Input value={aram_queues.join(", ")} onChange={e => set_aram_queues(e.target.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)))} />
						<p className="text-xs text-muted-foreground mt-0.5">Treated like the current ARAM / ARAM Mayhem modes</p>
					</div>
					<div>
						<Label className="text-sm">Arena modes</Label>
						<Input value={arena_queues.join(", ")} onChange={e => set_arena_queues(e.target.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)))} />
						<p className="text-xs text-muted-foreground mt-0.5">Shows completed champion challenges</p>
					</div>
					<div>
						<Label className="text-sm">Other all-random modes</Label>
						<Input value={other_queues.join(", ")} onChange={e => set_other_queues(e.target.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)))} />
						<p className="text-xs text-muted-foreground mt-0.5">Treated like the current ARURF mode (champion swapping)</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Disclaimer</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-xs text-muted-foreground">
						Crystal isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}