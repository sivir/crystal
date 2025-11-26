import React from "react";

interface props {
    children: React.ReactNode;
}

interface state {
    has_error: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<props, state> {
    constructor(props: any) {
        super(props);
        this.state = { has_error: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { has_error: true, error };
    }

    componentDidCatch(error: Error, error_info: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, error_info);
    }

    render() {
        if (this.state.has_error) {
            return <div>error</div>;
        }
        return this.props.children;
    }
}