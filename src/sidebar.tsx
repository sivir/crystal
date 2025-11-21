import { app } from "@tauri-apps/api";
import { useEffect, useState } from "react";
import { useData } from "@/data_context.tsx";
import { page_name } from "@/data_context.tsx";
import { refresh_data } from "@/App.tsx";
import { getVersion } from "@tauri-apps/api/app";

import { Home, Moon, Sun, RefreshCcw, Bug, Users, UserPen, Palette } from "lucide-react";
import {
	Sidebar,
	SidebarContent, SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from "@/components/ui/sidebar";
import { useTheme } from "@/theme-provider.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";

const items: { title: string, url: page_name, icon: any }[] = [
	{
		title: "Home",
		url: "home",
		icon: Home,
	},
	{
		title: "Lobby",
		url: "lobby",
		icon: Users,
	},
	{
		title: "Profile",
		url: "profile",
		icon: UserPen,
	},
	{
		title: "Skins",
		url: "skins",
		icon: Palette,
	},
	// {
	// 	title: "Settings",
	// 	url: "settings",
	// 	icon: Settings,
	// },
	{
		title: "Debug",
		url: "debug",
		icon: Bug,
	},
];

function ModeToggle() {
	const { setTheme, theme } = useTheme()

	return (
		<Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
			<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	)
}

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
	context.putImageData(imageData, 0, 0);
	const blob = await canvas.convertToBlob({
		type: "image/png"
	});
	return URL.createObjectURL(blob);
}

export function AppSidebar() {
	const {data, setData} = useData();
	const [image_src, set_image_src] = useState<string>("");
	const [version, setVersion] = useState<string>("");

	useEffect(() => {
		app_icon().then(x => set_image_src(x));
	}, []);

	useEffect(() => {
		getVersion().then(x => setVersion(x));
	}, []);

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
									<span className="truncate text-xs">v{version}</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild onClick={() => setData(prev => ({...prev, page: item.url}))}>
										<a href={"#"}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="flex items-center flex-row">
				<ModeToggle />
				<Button variant="outline" size="icon" onClick={() => refresh_data(setData)}>
					<RefreshCcw className="h-[1.2rem] w-[1.2rem]"/>
				</Button>
				<Badge variant={data.connected ? "success" : "destructive"} className="ml-2">
					{data.connected ? "connected" : "disconnected"}
				</Badge>
			</SidebarFooter>
		</Sidebar>
	)
}