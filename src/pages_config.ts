import { Bug, Users, Flame, Globe, Home, Palette, Settings, User, UserPen } from "lucide-react";
import Champions from "@/pages/champions";
import Lobby from "@/pages/lobby";
import Profile from "@/pages/profile";
import Skins from "@/pages/skins";
import Eternals from "@/pages/eternals";
import TeamBuilder from "@/pages/team_builder";
import Debug from "@/pages/debug";
import UserPage from "@/pages/user";
import { Skeleton } from "@/components/ui/skeleton";

export const pages: Record<string, { title: string, icon: React.ComponentType, component: React.ComponentType }> = {
	"home": {
		title: "Home",
		icon: Home,
		component: Champions,
	},
	"lobby": {
		title: "Lobby",
		icon: Users,
		component: Lobby,
	},
	"profile": {
		title: "Profile",
		icon: UserPen,
		component: Profile,
	},
	"skins": {
		title: "Skins",
		icon: Palette,
		component: Skins,
	},
	"eternals": {
		title: "Eternals",
		icon: Flame,
		component: Eternals,
	},
	"team_builder": {
		title: "Team Builder",
		icon: Globe,
		component: TeamBuilder,
	},
	"settings": {
		title: "Settings",
		icon: Settings,
		component: Skeleton,
	},
	"debug": {
		title: "Debug",
		icon: Bug,
		component: Debug,
	},
	"user": {
		title: "User",
		icon: User,
		component: UserPage,
	}
}
