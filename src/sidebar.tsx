import { app } from "@tauri-apps/api";
import { useEffect, useState } from "react";
import { useStaticPage, useGameflowPhase, useSetStaticData, page_name } from "@/data_context.tsx";
import { pages, page_groups, PageGroup } from "@/pages_config"

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge.tsx";

async function app_icon(): Promise<string> {
	const icon = await app.defaultWindowIcon();
	if (!icon) {
		return "";
	}
	const [data, size] = await Promise.all([icon.rgba(), icon.size()]);
	const canvas = new OffscreenCanvas(size.width, size.height);
	const context = canvas.getContext("2d");
	const imageData = new ImageData(
		new Uint8ClampedArray(data),
		size.width,
		size.height
	);
	if (!context) {
		return "";
	}
	context.putImageData(imageData, 0, 0);
	const blob = await canvas.convertToBlob({
		type: "image/png"
	});
	return URL.createObjectURL(blob);
}

export function AppSidebar() {
	const page = useStaticPage();
	const setStaticData = useSetStaticData();
	const gameflow_phase = useGameflowPhase();
	const [image_src, set_image_src] = useState<string>("");

	useEffect(() => {
		app_icon().then(x => set_image_src(x));
	}, []);

	// Group pages by their group property
	const grouped_pages = Object.entries(pages).reduce<Record<PageGroup, [string, typeof pages[string]][]>>((acc, entry) => {
		const group = entry[1].group;
		if (!acc[group]) acc[group] = [];
		acc[group].push(entry);
		return acc;
	}, {} as Record<PageGroup, [string, typeof pages[string]][]>);

	return (
		<Sidebar variant="inset">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<a href="#">
								<img src={image_src} alt="icon" />
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">crystal</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{(Object.keys(page_groups) as PageGroup[]).map(group_key => (
					<SidebarGroup key={group_key}>
						<SidebarGroupLabel>{page_groups[group_key]}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{(grouped_pages[group_key] || []).map(([key, item]) => (
									<SidebarMenuItem key={key}>
										<SidebarMenuButton
											asChild
											isActive={page === key}
											onClick={() => setStaticData(prev => ({ ...prev, page: key as page_name }))}
										>
											<a href={"#"}>
												<item.icon />
												<span>{item.title}</span>
												{key == "lobby" && gameflow_phase == "ChampSelect" && (
													<Badge className="bg-green-400">In Lobby</Badge>
												)}
											</a>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
		</Sidebar>
	)
}