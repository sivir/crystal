import { Dispatch, SetStateAction, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Generic type parameter to handle both string and number arrays
interface FilterDropdownProps<T extends string | number> {
	title: string;
	items: T[];
	selected_items: T[];
	set_selected_items: Dispatch<SetStateAction<T[]>>;
	item_to_label: (item: T) => string;
	width?: string;
}

// Use the generic type parameter in the component definition
export function FilterDropdown<T extends string | number>({
	title,
	items,
	selected_items,
	set_selected_items,
	item_to_label,
	width = "w-[200px]",
}: FilterDropdownProps<T>) {
	const [open, set_open] = useState(false);

	const handleItemChange = (item: T, checked: boolean) => {
		if (checked) {
			set_selected_items(prev => [...prev, item]);
		} else {
			set_selected_items(prev => prev.filter(id => id !== item));
		}
	};

	const handleSelectAll = (checked: boolean) => {
		set_selected_items(checked ? [...items] : []);
	};

	return (
		<DropdownMenu open={open} onOpenChange={set_open}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className={`${width} justify-between`}>
					{title} ({selected_items.length})
					<ChevronDown className="h-4 w-4 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className={width}>
				{items.map((item) => (
					<DropdownMenuCheckboxItem
						key={String(item)}
						checked={selected_items.includes(item)}
						onCheckedChange={(checked) => handleItemChange(item, checked)}
						onSelect={e => e.preventDefault()}
					>
						{item_to_label(item)}
					</DropdownMenuCheckboxItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem 
					checked={selected_items.length === items.length} 
					onCheckedChange={handleSelectAll}
					onSelect={e => e.preventDefault()}
				>
					Select All
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
