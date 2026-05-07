import { Bug, Users, Flame, Globe, Home, Palette, Settings, User, UserPen, Star } from "lucide-react";
import Champions from "@/pages/champions";
import Lobby from "@/pages/lobby";
import Profile from "@/pages/profile";
import Skins from "@/pages/skins";
import Eternals from "@/pages/eternals";
import TeamBuilder from "@/pages/team_builder";
import Debug from "@/pages/debug";
import UserPage from "@/pages/user";
import SettingsPage from "@/pages/settings";
import Mastery from "@/pages/mastery";

export type PageGroup = "main" | "tools" | "system";

export const page_groups: Record<PageGroup, string> = {
	main: "Main",
	tools: "Tools",
	system: "System",
};

export const pages: Record<string, { title: string, icon: React.ComponentType, component: React.ComponentType, group: PageGroup }> = {
	"home": {
		title: "Home",
		icon: Home,
		component: Champions,
		group: "main",
	},
	"mastery": {
		title: "Mastery",
		icon: Star,
		component: Mastery,
		group: "main",
	},
	"lobby": {
		title: "Lobby",
		icon: Users,
		component: Lobby,
		group: "main",
	},
	"profile": {
		title: "Profile",
		icon: UserPen,
		component: Profile,
		group: "tools",
	},
	"skins": {
		title: "Skins",
		icon: Palette,
		component: Skins,
		group: "tools",
	},
	"eternals": {
		title: "Eternals",
		icon: Flame,
		component: Eternals,
		group: "tools",
	},
	"team_builder": {
		title: "Team Builder",
		icon: Globe,
		component: TeamBuilder,
		group: "tools",
	},
	"settings": {
		title: "Settings",
		icon: Settings,
		component: SettingsPage,
		group: "system",
	},
	"debug": {
		title: "Debug",
		icon: Bug,
		component: Debug,
		group: "system",
	},
	"user": {
		title: "User",
		icon: User,
		component: UserPage,
		group: "main",
	}
}
