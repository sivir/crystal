import { ReactElement } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useStaticData } from "@/data_context.tsx";
import { pages } from "@/pages_config"

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { X, Square, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: ReactElement }) {
	const {static_data} = useStaticData();
	return (
		<SidebarProvider className="overflow-hidden">
			<AppSidebar />
			<SidebarInset className="overflow-hidden">
				<main className="flex flex-col h-full relative">
					<header data-tauri-drag-region="true" className="absolute top-0 left-0 right-0 flex h-16 items-center justify-between px-4 bg-background z-10">
						<div className="flex items-center gap-2">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />
							<Breadcrumb>
								<BreadcrumbList>
									<BreadcrumbItem>
										<BreadcrumbPage>{pages[static_data.page].title}</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="ghost" className="rounded-full size-6 p-2" onClick={() => getCurrentWindow().minimize()}>
								<Minus />
							</Button>
							<Button variant="ghost" className="rounded-full size-6 p-2" onClick={() => getCurrentWindow().toggleMaximize()}>
								<Square />
							</Button>
							<Button variant="ghost" className="rounded-full size-6 p-2" onClick={() => getCurrentWindow().hide()}>
								<X />
							</Button>
						</div>
					</header>
					<div className="absolute top-16 bottom-0 left-0 right-0 overflow-y-auto overflow-x-hidden">
						{children}
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}