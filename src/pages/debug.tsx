import { useState } from "react";
import { useData } from "@/data_context";
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
    const { data } = useData();
    const [path, setPath] = useState<string>("/lol-summoner/v1/current-summoner");
    const [requestBody, setRequestBody] = useState<string>("{}");
    const [response, setResponse] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const handleRequest = async (method: "GET" | "POST" | "PUT") => {
        setLoading(true);
        try {
            let parsedBody = undefined;

            // Parse JSON body for POST/PUT
            if (method !== "GET" && requestBody.trim()) {
                try {
                    parsedBody = JSON.parse(requestBody);
                } catch (err) {
                    console.error("Invalid JSON in request body");
                }
            }

            // Make the request using the unified function
            const result = await invoke("lcu_request", {
                method,
                path,
                body: parsedBody
            });

            console.log("result", result);

            setResponse(JSON.stringify(result, null, 2));
        } catch (err) {
            setResponse("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container p-6">
            {!data.connected && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Not connected to League client. Start the client to use this tool.
                    </AlertDescription>
                </Alert>
            )}
            
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
                                onChange={(e) => setPath(e.target.value)} 
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
                                <Button 
                                    onClick={() => handleRequest("GET")} 
                                    disabled={loading || !data.connected}
                                >
                                    {loading ? "Loading..." : "Send GET Request"}
                                </Button>
                            </TabsContent>
                            
                            <TabsContent value="post" className="space-y-4">
                                <div>
                                    <Label htmlFor="post-body">Request Body (JSON)</Label>
                                    <Textarea 
                                        id="post-body" 
                                        value={requestBody} 
                                        onChange={(e) => setRequestBody(e.target.value)} 
                                        rows={5}
                                    />
                                </div>
                                <Button 
                                    onClick={() => handleRequest("POST")} 
                                    disabled={loading || !data.connected}
                                >
                                    {loading ? "Loading..." : "Send POST Request"}
                                </Button>
                            </TabsContent>
                            
                            <TabsContent value="put" className="space-y-4">
                                <div>
                                    <Label htmlFor="put-body">Request Body (JSON)</Label>
                                    <Textarea 
                                        id="put-body" 
                                        value={requestBody} 
                                        onChange={(e) => setRequestBody(e.target.value)} 
                                        rows={5}
                                    />
                                </div>
                                <Button 
                                    onClick={() => handleRequest("PUT")} 
                                    disabled={loading || !data.connected}
                                >
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
        </div>
    );
}