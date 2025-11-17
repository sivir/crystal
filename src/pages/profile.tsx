import { useEffect, useState } from "react";
import { challenge_icon, lcu_post_request, lcu_put_request } from "@/lib/utils.ts";
import { useData } from "@/data_context.tsx";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import APIButton from "@/components/api_button.tsx";

export default function Profile() {
	const { data } = useData();
	const [profile_icons, set_profile_icons] = useState<number[]>([0, 0, 0]);
	const [active_slot, set_active_slot] = useState<number | null>(null);
	const [text_content, set_text_content] = useState<string>("");

	useEffect(() => {
		if (data.riot_data.preferences) {
			set_profile_icons(data.riot_data.preferences.challengeIds);
		}
	}, [data.riot_data.preferences]);

	const handle_icon_click = (id: number) => {
		if (active_slot !== null) {
			const new_icons = [...profile_icons];
			new_icons[active_slot] = id;
			set_profile_icons(new_icons);
			set_active_slot(null);
		}
	};

	const available_challenges = data.riot_data.challenges.map(x => x.challengeId);

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Profile</h1>

			<Card>
				<CardHeader>
					<CardTitle>Profile Icons</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<div className="text-sm font-medium mb-2">
							{active_slot !== null ? `Select an icon for Slot ${active_slot + 1}` : "Click a slot to select an icon"}
						</div>
						<div className="flex gap-4">
							{profile_icons.map((id, slot_index) => (
								<button
									key={slot_index}
									onClick={() => set_active_slot(slot_index)}
									className={`relative w-32 h-32 rounded-md border-2 transition-all ${
										active_slot === slot_index
											? "border-primary ring-2 ring-primary ring-offset-2"
											: "border-muted hover:border-muted-foreground"
									}`}
								>
									<img
										src={challenge_icon(id)}
										alt={`slot ${slot_index + 1}`}
										className="w-full h-full object-cover rounded-md"
									/>
									<div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 text-center rounded-b-md">
										Slot {slot_index + 1}
									</div>
								</button>
							))}
						</div>
					</div>

					{active_slot !== null && (
						<div className="grid grid-cols-8 gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-md">
							{available_challenges.map((id) => (
								<button
									key={id}
									onClick={() => handle_icon_click(id)}
									className="relative w-16 h-16 rounded-md transition-all hover:ring-2 hover:ring-primary"
								>
									<img
										src={challenge_icon(id)}
										alt={`icon ${id}`}
										className="w-full h-full object-cover rounded-md"
									/>
								</button>
							))}
						</div>
					)}

					<APIButton onClick={() => lcu_post_request("/lol-challenges/v1/update-player-preferences", { ...data.riot_data.preferences, challengeIds: profile_icons })}>Update Icons</APIButton>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Custom Status</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Textarea
						value={text_content}
						onChange={(e) => set_text_content(e.target.value)}
						placeholder="Enter your text here..."
						rows={10}
						className="w-full"
					/>
					<APIButton onClick={() => lcu_put_request("/lol-chat/v1/me", { statusMessage: text_content })}>Update Status</APIButton>
				</CardContent>
			</Card>
		</div>
	);
}