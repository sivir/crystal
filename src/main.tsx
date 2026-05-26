import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Layout from "./layout";
import { ThemeProvider } from "./theme-provider";
import { StaticDataProvider, SessionDataProvider } from "@/data_context.tsx";
import { OptimalPathProvider } from "@/hooks/use-optimal-path";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "./error_boundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			{/* <TooltipProvider> */}
				<StaticDataProvider>
						<OptimalPathProvider>
							<SessionDataProvider>
								<Layout>
									<ErrorBoundary>
										<App />
									</ErrorBoundary>
								</Layout>
							</SessionDataProvider>
						</OptimalPathProvider>
				</StaticDataProvider>
			{/* </TooltipProvider> */}
		</ThemeProvider>
	</React.StrictMode>
);
