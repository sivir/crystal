import { useEffect, useMemo, useState } from "react";
import { challenge_icon, lcu_post_request, lcu_put_request } from "@/lib/utils.ts";

import { useStaticData } from "@/data_context.tsx";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import APIButton from "@/components/api_button.tsx";

export default function Profile() {
	const { static_data } = useStaticData();
	const [profile_icons, set_profile_icons] = useState<number[]>([0, 0, 0]);
	const [active_slot, set_active_slot] = useState<number | null>(null);
	const [text_content, set_text_content] = useState<string>("");
	const [search_query, set_search_query] = useState<string>("");

	useEffect(() => {
		if (static_data.riot_data.preferences) {
			set_profile_icons(static_data.riot_data.preferences.challengeIds);
		}
	}, [static_data.riot_data.preferences]);

	const handle_icon_click = (id: number) => {
		if (active_slot !== null) {
			set_profile_icons(prev => {
				prev[active_slot] = id;
				return prev;
			});
			set_active_slot(null);
		}
	};

	const filtered_challenges = useMemo(() => {
		const all_challenges = static_data.riot_data.challenges.map(x => x.challengeId);

		const query = search_query.toLowerCase().trim();
		return all_challenges.filter(id => {
			const name = static_data.lcu_data[id]?.name || "";
			return name.toLowerCase().includes(query);
		});
	}, [static_data.riot_data.challenges, search_query]);

	return (
		<div className="p-6 space-y-6">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Profile Icons</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<div className="text-sm font-medium mb-2">
								{active_slot !== null ? `Select an icon for Slot ${active_slot + 1}` : "Click a slot to select an icon"}
							</div>
							<div className="flex gap-3">
								{profile_icons.map((id, slot_index) => (
									<Tooltip key={slot_index}>
										<TooltipTrigger asChild>
											<button
												onClick={() => set_active_slot(slot_index)}
												className={`relative w-24 h-24 rounded-md border-2 transition-all ${
													active_slot === slot_index
														? "border-primary ring-2 ring-primary ring-offset-2"
														: "border-muted hover:border-muted-foreground"
												}`}
											>
												<img
													src={challenge_icon(static_data.lcu_data, id)}
													alt={`slot ${slot_index + 1}`}
													className="w-full h-full object-cover rounded-md"
												/>
												<div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-0.5 text-center rounded-b-md">
													Slot {slot_index + 1}
												</div>
											</button>
										</TooltipTrigger>
										<TooltipContent>
											<p>{static_data.lcu_data[id]?.name || `Challenge ${id}`}</p>
										</TooltipContent>
									</Tooltip>
								))}
							</div>
						</div>

						{active_slot !== null && (
							<div className="space-y-2">
								<Input
									type="text"
									placeholder="Search challenges..."
									value={search_query}
									onChange={(e) => set_search_query(e.target.value)}
									className="w-full"
								/>
								<div className="grid grid-cols-6 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-md">
									{filtered_challenges.map((id) => (
										<Tooltip key={id}>
											<TooltipTrigger asChild>
												<button
													onClick={() => handle_icon_click(id)}
													className="relative w-12 h-12 rounded-md transition-all hover:ring-2 hover:ring-primary"
												>
													<img
														src={challenge_icon(static_data.lcu_data, id)}
														alt={`icon ${id}`}
														className="w-full h-full object-cover rounded-md"
													/>
												</button>
											</TooltipTrigger>
											<TooltipContent>
												<p>{static_data.lcu_data[id]?.name || `Challenge ${id}`}</p>
											</TooltipContent>
										</Tooltip>
									))}
								</div>
							</div>
						)}

						<APIButton onClick={() => lcu_post_request("/lol-challenges/v1/update-player-preferences", { ...static_data.riot_data.preferences, challengeIds: profile_icons })}>Update Icons</APIButton>
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
		</div>
	);
}