import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Button } from "@/components/ui/button.tsx";
import { getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useEffect, useState } from "react";
import { Github, MessageCircle } from "lucide-react";

export default function Settings() {
	const [close_button_exits_app, set_close_button_exits_app] = usePersistedState<boolean>("settings.close_button_exits_app", false);
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
		<div className="p-6 space-y-6">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<MessageCircle className="w-5 h-5" />
							Support & Feedback
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-muted-foreground">
							Message <span className="font-semibold text-foreground">cyanscars</span> on Discord for support, suggestions, and feedback!
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Github className="w-5 h-5" />
							Source Code
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-muted-foreground">
							Check out the project on GitHub for updates and source code.
						</p>
						<a
							href="https://github.com/sivir/crystal"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 text-primary hover:underline"
						>
							github.com/sivir/crystal
						</a>
						<p className="text-sm text-muted-foreground">
							Please star the repo if you like the app!
						</p>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Updates</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Current Version: v{version}</p>
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
						<Button onClick={handleCheckUpdate} disabled={checking}>
							{checking ? "Checking..." : "Check for Updates"}
						</Button>
					</div>
					{update && (
						<Button variant="default" onClick={handleDownloadInstall} disabled={installing} className="w-full">
							{installing ? "Installing Update..." : `Install Update v${update.version}`}
						</Button>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Behavior</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-start gap-3">
						<Checkbox
							id="close-button-exits-app"
							checked={close_button_exits_app}
							onCheckedChange={(checked) => set_close_button_exits_app(checked === true)}
						/>
						<div className="-mt-1">
							<Label htmlFor="close-button-exits-app" className="cursor-pointer">
								Close button exits app
							</Label>
							<p className="text-sm text-muted-foreground">
								When disabled, clicking the close button hides Crystal to the system tray instead of fully closing it.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Disclaimer</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Crystal isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}