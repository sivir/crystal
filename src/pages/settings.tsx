import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Github, MessageCircle } from "lucide-react";

export default function Settings() {
	const [close_button_exits_app, set_close_button_exits_app] = usePersistedState<boolean>("settings.close_button_exits_app", false);

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