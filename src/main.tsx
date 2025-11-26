import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Layout from "./layout";
import { ThemeProvider } from "./theme-provider";
import { StaticDataProvider, SessionDataProvider } from "@/data_context.tsx";
import { ErrorBoundary } from "./error_boundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<StaticDataProvider>
				<SessionDataProvider>
					<Layout>
						<ErrorBoundary>
							<App />
						</ErrorBoundary>
					</Layout>
				</SessionDataProvider>
			</StaticDataProvider>
		</ThemeProvider>
	</React.StrictMode>
);
