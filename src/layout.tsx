import { ReactElement } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useStaticData } from "@/data_context.tsx";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { pages } from "@/pages_config"

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/sidebar";
import { Separator } from "@/components/ui/separator";
import { StatusBar } from "@/status_bar";
import { X, Square, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: ReactElement }) {
	const {static_data} = useStaticData();
	const [close_button_exits_app] = usePersistedState<boolean>("settings.close_button_exits_app", false);

	const handle_close = async () => {
		const current_window = getCurrentWindow();
		if (close_button_exits_app) {
			await current_window.close();
			return;
		}
		await current_window.hide();
	};

	return (
		<SidebarProvider className="overflow-hidden">
			<AppSidebar />
			<SidebarInset className="overflow-hidden">
				<div className="absolute inset-0 flex flex-col">
					<header data-tauri-drag-region="true" className="flex h-12 items-center justify-between px-4 bg-background/80 backdrop-blur-sm shrink-0 z-10">
						<div className="flex items-center gap-2">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />
							<span className="text-sm font-medium">{pages[static_data.page].title}</span>
						</div>
						<div className="flex items-center gap-1">
							<Button variant="ghost" className="rounded-full size-6 p-1" onClick={() => getCurrentWindow().minimize()}>
								<Minus className="h-3.5 w-3.5" />
							</Button>
							<Button variant="ghost" className="rounded-full size-6 p-1" onClick={() => getCurrentWindow().toggleMaximize()}>
								<Square className="h-3 w-3" />
							</Button>
							<Button variant="ghost" className="rounded-full size-6 p-1 hover:bg-red-500/10 hover:text-red-500" onClick={handle_close}>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>
					</header>
					<main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
						{children}
					</main>
					<StatusBar />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}