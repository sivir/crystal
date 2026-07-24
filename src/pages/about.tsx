import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, MessageCircle } from "lucide-react";

export default function About() {
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
