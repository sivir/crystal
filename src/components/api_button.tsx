import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";

interface APIButtonProps extends Omit<ButtonProps, 'onClick'> {
	onClick: () => Promise<void>;
	children?: React.ReactNode;
}

export default function APIButton({ onClick, children, ...props }: APIButtonProps) {
	const [loading, set_loading] = useState<boolean>(false);

	const handle_click = async () => {
		set_loading(true);
		try {
			await onClick();
		} catch (error) {
			console.error("API Button error:", error);
		} finally {
			set_loading(false);
		}
	};

	return (
		<Button onClick={handle_click} disabled={loading} {...props}>
			{loading ? "Loading..." : children}
		</Button>
	);
}