import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Layout from "./layout";
import { ThemeProvider } from "./theme-provider";
import { DataProvider } from "@/data_context.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<DataProvider>
				<Layout>
					<App />
				</Layout>
			</DataProvider>
		</ThemeProvider>
	</React.StrictMode>,
);
