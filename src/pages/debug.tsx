import { useState } from "react";
import { useStaticData } from "@/data_context";
import { invoke } from "@tauri-apps/api/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Debug() {
	const { static_data } = useStaticData();
	const [path, set_path] = useState<string>("");
	const [request_body, set_request_body] = useState<string>("{}");
	const [response, set_response] = useState<string>("");
	const [loading, set_loading] = useState<boolean>(false);

	const handleRequest = async (method: "get" | "post" | "put") => {
		set_loading(true);
		try {
			let parsedBody = undefined;

			if (method !== "get" && request_body.trim()) {
				try {
					parsedBody = JSON.parse(request_body);
					console.log("parsedBody", parsedBody);
				} catch (err) {
					console.error("Invalid JSON in request body");
				}
			}

			const result = await invoke("lcu_request", { method, path, body: parsedBody });
			console.log("result", result);
			set_response(JSON.stringify(result, null, 2));
		} catch (err) {
			set_response("");
			console.log("err", err);
		} finally {
			set_loading(false);
		}
	};

	return (
		<div className="container p-6">
			{!static_data.connected && (
				<Alert variant="destructive" className="mb-4">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Not connected to League client!
					</AlertDescription>
				</Alert>
			)}
			<div className="flex flex-col gap-2">
				<Card>
					<CardHeader>
						<CardTitle>LCU API Request</CardTitle>
						<CardDescription>
							Make requests to the League Client API
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div>
								<Label htmlFor="path">Path</Label>
								<Input
									id="path"
									value={path}
									onChange={(e) => set_path(e.target.value)}
									placeholder="/lol-summoner/v1/current-summoner"
								/>
							</div>

							<Tabs defaultValue="get">
								<TabsList>
									<TabsTrigger value="get">GET</TabsTrigger>
									<TabsTrigger value="post">POST</TabsTrigger>
									<TabsTrigger value="put">PUT</TabsTrigger>
								</TabsList>

								<TabsContent value="get">
									<Button onClick={() => handleRequest("get")} disabled={loading || !static_data.connected}>
										{loading ? "Loading..." : "Send GET Request"}
									</Button>
								</TabsContent>

								<TabsContent value="post" className="space-y-4">
									<div>
										<Label htmlFor="post-body">Request Body (JSON)</Label>
										<Textarea
											id="post-body"
											value={request_body}
											onChange={(e) => set_request_body(e.target.value)}
											rows={5}
										/>
									</div>
									<Button onClick={() => handleRequest("post")} disabled={loading || !static_data.connected}>
										{loading ? "Loading..." : "Send POST Request"}
									</Button>
								</TabsContent>

								<TabsContent value="put" className="space-y-4">
									<div>
										<Label htmlFor="put-body">Request Body (JSON)</Label>
										<Textarea
											id="put-body"
											value={request_body}
											onChange={(e) => set_request_body(e.target.value)}
											rows={5}
										/>
									</div>
									<Button onClick={() => handleRequest("put")} disabled={loading || !static_data.connected}>
										{loading ? "Loading..." : "Send PUT Request"}
									</Button>
								</TabsContent>
							</Tabs>
						</div>
					</CardContent>
				</Card>

				{response && (
					<Card className="mt-4">
						<CardHeader>
							<CardTitle>Response</CardTitle>
						</CardHeader>
						<CardContent>
							<pre className="bg-muted p-4 rounded-md overflow-auto max-h-[500px]">
								{response}
							</pre>
						</CardContent>
					</Card>
				)}

				Crystal isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
			</div>
		</div>
	);
}