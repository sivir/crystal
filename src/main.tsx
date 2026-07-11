import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Layout from "./layout";
import { ThemeProvider } from "./theme-provider";
import { OptimalPathProvider } from "@/hooks/use-optimal-path";
import { ErrorBoundary } from "./error_boundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<OptimalPathProvider>
				<Layout>
					<ErrorBoundary>
						<App />
					</ErrorBoundary>
				</Layout>
			</OptimalPathProvider>
		</ThemeProvider>
	</React.StrictMode>
);
