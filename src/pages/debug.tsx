import { useData } from "@/data_context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Debug() {
    const { data } = useData();

    const formatJson = (obj: any) => {
        return JSON.stringify(obj);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="grid gap-4">
                {Object.entries(data).map(([key, value]) => (
                    <Card key={key}>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">{key}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[400px] text-sm">
                                {formatJson(value)}
                            </pre>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}