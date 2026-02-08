import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, MessageCircle } from "lucide-react";

export default function Settings() {
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