import { useMemo, useState } from "react";
import { useStaticData, APILCUChallenge } from "@/data_context";
import { challenge_icon, SortDirection, levels, get_level_color, get_progress_color } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ArrowDown, ArrowUp, List, Plus, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePersistedState } from "@/hooks/use-persisted-state";

type ProgressMode = "next" | "master";

type ChallengeTagAssignments = Record<string, string[]>;

type ChallengeProps = {
	challenge: APILCUChallenge;
	progress: number;
	target_threshold: number;
	target_label: string;
	assigned_tags: string[];
}

function getChallengeProgress(challenge: APILCUChallenge, progress_mode: ProgressMode) {
	const next_level_index = levels.indexOf(challenge.currentLevel) + 1;
	const next_level = next_level_index < levels.length ? levels[next_level_index] : "CHALLENGER";
	const master_threshold = challenge.thresholds["MASTER"]?.value;
	const next_threshold = challenge.thresholds[next_level]?.value || master_threshold || challenge.thresholds[challenge.currentLevel]?.value || challenge.currentValue || 1;
	const target_threshold = progress_mode === "master" ? (master_threshold || next_threshold) : next_threshold;
	const progress = (challenge.currentValue / target_threshold) * 100;

	return {
		progress,
		target_threshold,
		target_label: progress_mode === "master" ? "MASTER" : next_level,
	};
}

function TagFilterDropdown({
	tags,
	selected_tags,
	set_selected_tags,
}: {
	tags: string[];
	selected_tags: string[];
	set_selected_tags: (value: string[] | ((prev: string[]) => string[])) => void;
}) {
	const handle_tag_filter_change = (tag: string, checked: boolean) => {
		set_selected_tags(prev => checked ? [...prev.filter(t => t !== tag), tag] : prev.filter(t => t !== tag));
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="w-[180px] justify-between">
					<span className="flex items-center gap-2">
						<Tag className="h-4 w-4" />
						Filter Tags ({selected_tags.length})
					</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[220px]">
				<DropdownMenuLabel>Filter by tags</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{tags.length === 0 ? (
					<DropdownMenuItem disabled>No tags created yet</DropdownMenuItem>
				) : (
					tags.map(tag => (
						<DropdownMenuCheckboxItem
							key={tag}
							checked={selected_tags.includes(tag)}
							onCheckedChange={(checked) => handle_tag_filter_change(tag, checked)}
							onSelect={(e) => e.preventDefault()}
						>
							{tag}
						</DropdownMenuCheckboxItem>
					))
				)}
				{selected_tags.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => set_selected_tags([])}>
							Clear filters
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ChallengeTagSelector({
	tags,
	assigned_tags,
	on_toggle_tag,
	compact = false,
}: {
	tags: string[];
	assigned_tags: string[];
	on_toggle_tag: (tag: string, checked: boolean) => void;
	compact?: boolean;
}) {
	return (
		<div onClick={(e) => e.stopPropagation()}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant={compact ? "ghost" : "outline"}
						size={compact ? "icon" : "sm"}
						className={compact ? "relative h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-foreground" : "h-7 gap-1 px-2 text-xs"}
						onClick={(e) => e.stopPropagation()}
						title="Assign tags"
					>
						<Tag className="h-3.5 w-3.5" />
						{compact && assigned_tags.length > 0 && (
							<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
								{assigned_tags.length}
							</span>
						)}
						{!compact && <>Tags {assigned_tags.length > 0 ? `(${assigned_tags.length})` : ""}</>}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-[220px]" align="start">
					<DropdownMenuLabel>Assign tags</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{tags.length === 0 ? (
						<DropdownMenuItem disabled>Create a tag first</DropdownMenuItem>
					) : (
						tags.map(tag => (
							<DropdownMenuCheckboxItem
								key={tag}
								checked={assigned_tags.includes(tag)}
								onCheckedChange={(checked) => on_toggle_tag(tag, checked)}
								onSelect={(e) => e.preventDefault()}
							>
								{tag}
							</DropdownMenuCheckboxItem>
						))
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function ChallengeTagBadges({ assigned_tags }: { assigned_tags: string[] }) {
	if (assigned_tags.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-1">
			{assigned_tags.map(tag => (
				<Badge key={tag} variant="secondary" className="text-[10px] font-medium">
					{tag}
				</Badge>
			))}
		</div>
	);
}


function ChallengeSummary({ challenge }: { challenge: APILCUChallenge }) {
	const threshold_entries = levels
		.filter(level => challenge.thresholds[level]?.value != null)
		.map(level => ({ level, value: challenge.thresholds[level].value }));

	return (
		<HoverCard openDelay={150} closeDelay={0}>
			<HoverCardTrigger asChild>
				<div className="flex flex-col min-w-0 flex-1 cursor-help">
					<div className={`font-semibold text-sm truncate ${get_level_color(challenge.currentLevel)}`}>
						{challenge.name}
					</div>
					<div className="text-xs text-muted-foreground line-clamp-2">
						{challenge.description}
					</div>
				</div>
			</HoverCardTrigger>
			<HoverCardContent className="w-80 space-y-3" align="start">
				<div className="space-y-1">
					<div className={`text-sm font-semibold ${get_level_color(challenge.currentLevel)}`}>
						{challenge.name}
					</div>
					<p className="text-xs text-muted-foreground whitespace-pre-wrap">
						{challenge.description}
					</p>
				</div>

				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Current progress</span>
					<span className={get_level_color(challenge.currentLevel)}>{challenge.currentLevel}</span>
				</div>
				<div className="text-sm font-medium">{challenge.currentValue.toLocaleString()}</div>

				<div className="space-y-2">
					<div className="text-xs font-medium text-muted-foreground">Tier thresholds</div>
					<div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
						{threshold_entries.map(({ level, value }) => (
							<div key={level} className="contents">
								<span className={get_level_color(level)}>{level}</span>
								<span className="text-right text-muted-foreground">{value.toLocaleString()}</span>
							</div>
						))}
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}

function ChallengeCard({
	challenge,
	progress_mode,
	tags,
	on_toggle_tag,
}: {
	challenge: ChallengeProps,
	progress_mode: ProgressMode,
	tags: string[],
	on_toggle_tag: (challenge_id: number, tag: string, checked: boolean) => void,
}) {
	const { static_data } = useStaticData();
	const [dialog_open, set_dialog_open] = useState(false);
	const show_target_label = !["MASTER", "GRANDMASTER", "CHALLENGER"].includes(challenge.challenge.currentLevel);

	const has_id_list = challenge.challenge.availableIds.length > 0 || challenge.challenge.completedIds.length > 0;

	const parent_challenge = challenge.challenge.parentId ? static_data.lcu_data[challenge.challenge.parentId] : null;
	const parent_info = parent_challenge ? (() => {
		const parent_progress = getChallengeProgress(parent_challenge, progress_mode);
		return {
			name: parent_challenge.name,
			progress: Math.min(parent_progress.progress, 100),
			current: parent_challenge.currentValue,
			target: parent_progress.target_threshold,
			level: parent_challenge.currentLevel,
		};
	})() : null;

	function get_id_name(id: number): string {
		if (challenge.challenge.idListType === "CHAMPION_SKIN") {
			return static_data.skin_map[id]?.name || String(id);
		} else if (challenge.challenge.idListType === "CHAMPION") {
			return static_data.champion_map[id]?.name || String(id);
		} else {
			return String(id);
		}
	}

	return (
		<>
			<Card
				className={`p-3 flex flex-col h-full ${has_id_list ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
				onClick={() => has_id_list && set_dialog_open(true)}
			>
				{/* Main challenge info */}
				<div className="flex gap-3 mb-2">
					<img
						src={challenge_icon(challenge.challenge)}
						alt={challenge.challenge.name}
						className="w-10 h-10 rounded-full shrink-0"
					/>
						<ChallengeSummary challenge={challenge.challenge} />
						<div className="flex items-start gap-1 shrink-0">
							<ChallengeTagSelector
								tags={tags}
								assigned_tags={challenge.assigned_tags}
								on_toggle_tag={(tag, checked) => on_toggle_tag(challenge.challenge.id, tag, checked)}
								compact
							/>
							{has_id_list && (
								<List className="w-4 h-4 text-muted-foreground shrink-0 mt-1.5" />
							)}
						</div>
				</div>

				{/* Progress section */}
				<div className="mt-auto space-y-1">
					<div className="flex justify-between text-xs">
							<span className={get_level_color(challenge.challenge.currentLevel)}>
								{show_target_label ? `${challenge.challenge.currentLevel} → ${challenge.target_label}` : challenge.challenge.currentLevel}
							</span>
							<span className="text-muted-foreground">{challenge.challenge.currentValue} / {challenge.target_threshold}</span>
					</div>
					<Progress
						value={Math.min(challenge.progress, 100)}
						className="h-1.5 bg-muted"
						indicatorClassName={get_progress_color(challenge.challenge.currentLevel)}
					/>
				</div>

				{/* Parent category info */}
				{parent_info && (
					<div className="mt-3 pt-2 border-t border-border/50 space-y-1">
						<div className="flex justify-between text-xs">
								<span className={`truncate ${get_level_color(parent_info.level)}`}>{parent_info.name}</span>
							<span className="text-muted-foreground shrink-0 ml-2">{parent_info.current} / {parent_info.target}</span>
						</div>
						<Progress
							value={parent_info.progress}
							className="h-1 bg-muted"
							indicatorClassName={get_progress_color(parent_info.level)}
						/>
					</div>
				)}
			</Card>

			<Dialog open={dialog_open} onOpenChange={set_dialog_open}>
				<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle className={get_level_color(challenge.challenge.currentLevel)}>
							{challenge.challenge.name}
						</DialogTitle>
						<DialogDescription>{challenge.challenge.description}</DialogDescription>
					</DialogHeader>
						<div className="border-b border-border/50 pb-4 mb-4 space-y-2">
							<div className="text-sm font-medium">Tags</div>
							<ChallengeTagSelector
								tags={tags}
								assigned_tags={challenge.assigned_tags}
								on_toggle_tag={(tag, checked) => on_toggle_tag(challenge.challenge.id, tag, checked)}
							/>
							<ChallengeTagBadges assigned_tags={challenge.assigned_tags} />
						</div>
					<div className="grid grid-cols-2 gap-4 overflow-y-auto flex-1">
						<div>
							<h4 className="font-semibold mb-2 text-green-400 text-sm">
								Completed ({challenge.challenge.completedIds.length})
							</h4>
							<div className="flex flex-wrap gap-1 max-h-[300px] overflow-y-auto">
								{challenge.challenge.completedIds
									.map(id => ({ id, name: get_id_name(id) }))
									.sort((a, b) => a.name.localeCompare(b.name))
									.map(({ id, name }) => (
										<span key={id} className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 px-2 py-0.5 rounded text-xs">
											{name}
										</span>
									))}
							</div>
						</div>
						<div>
							<h4 className="font-semibold mb-2 text-yellow-400 text-sm">
								Available ({challenge.challenge.availableIds.length})
							</h4>
							<div className="flex flex-wrap gap-1 max-h-[300px] overflow-y-auto">
								{challenge.challenge.availableIds
									.map(id => ({ id, name: get_id_name(id) }))
									.sort((a, b) => a.name.localeCompare(b.name))
									.map(({ id, name }) => (
										<span key={id} className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 px-2 py-0.5 rounded text-xs">
											{name}
										</span>
									))}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default function User() {
	const { static_data } = useStaticData();
	const [search, set_search] = usePersistedState("user.search", "");
	const [sort_by, set_sort_by] = usePersistedState<"name" | "progress">("user.sort_by", "progress");
	const [sort_order, set_sort_order] = usePersistedState<SortDirection>("user.sort_order", "desc");
	const [progress_mode, set_progress_mode] = usePersistedState<ProgressMode>("user.progress_mode", "next");
	const [hide_masters, set_hide_masters] = usePersistedState("user.hide_masters", true);
	const [hide_legacy, set_hide_legacy] = usePersistedState("user.hide_legacy", true);
	const [hide_capstone, set_hide_capstone] = usePersistedState("user.hide_capstone", true);
	const [tags, set_tags] = usePersistedState<string[]>("user.tags", []);
	const [challenge_tag_assignments, set_challenge_tag_assignments] = usePersistedState<ChallengeTagAssignments>("user.challenge_tag_assignments", {});
	const [selected_tag_filters, set_selected_tag_filters] = usePersistedState<string[]>("user.selected_tag_filters", []);
	const [tags_dialog_open, set_tags_dialog_open] = useState(false);
	const [new_tag_name, set_new_tag_name] = useState("");

	const normalized_new_tag_name = new_tag_name.trim();
	const can_create_tag = normalized_new_tag_name.length > 0 && !tags.some(tag => tag.toLowerCase() === normalized_new_tag_name.toLowerCase());

	const create_tag = () => {
		if (!can_create_tag) return;

		set_tags(prev => [...prev, normalized_new_tag_name].sort((a, b) => a.localeCompare(b)));
		set_new_tag_name("");
	};

	const delete_tag = (tag: string) => {
		set_tags(prev => prev.filter(t => t !== tag));
		set_selected_tag_filters(prev => prev.filter(t => t !== tag));
		set_challenge_tag_assignments(prev => {
			const next_assignments: ChallengeTagAssignments = {};

			for (const [challenge_id, assigned_tags] of Object.entries(prev)) {
				const filtered_tags = assigned_tags.filter(t => t !== tag);
				if (filtered_tags.length > 0) {
					next_assignments[challenge_id] = filtered_tags;
				}
			}

			return next_assignments;
		});
	};

	const toggle_challenge_tag = (challenge_id: number, tag: string, checked: boolean) => {
		set_challenge_tag_assignments(prev => {
			const challenge_key = String(challenge_id);
			const current_tags = prev[challenge_key] ?? [];
			const next_tags = checked
				? current_tags.includes(tag) ? current_tags : [...current_tags, tag]
				: current_tags.filter(t => t !== tag);

			if (next_tags.length === 0) {
				const { [challenge_key]: _, ...rest } = prev;
				return rest;
			}

			return {
				...prev,
				[challenge_key]: next_tags,
			};
		});
	};

	const filtered_challenges: ChallengeProps[] = useMemo(() => {
		let challenges = Object.values(static_data.lcu_data);

		if (hide_legacy) {
			challenges = challenges.filter(c => c.category !== "LEGACY");
		}

		if (search) {
			challenges = challenges.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()));
		}

		if (hide_capstone) {
			challenges = challenges.filter(c => !c.isCapstone);
		}

		if (selected_tag_filters.length > 0) {
			challenges = challenges.filter(c => {
				const assigned_tags = challenge_tag_assignments[c.id] ?? [];
				return selected_tag_filters.some(tag => assigned_tags.includes(tag));
			});
		}

		let props_challenges = challenges.map(c => {
			const { progress, target_threshold, target_label } = getChallengeProgress(c, progress_mode);

			return {
				challenge: c,
				progress,
				target_threshold,
				target_label,
				assigned_tags: challenge_tag_assignments[c.id] ?? [],
			};
		}).sort((a, b) => {
			if (sort_by === "name") return a.challenge.name.localeCompare(b.challenge.name) * (sort_order === "asc" ? -1 : 1);
			//if (sort_by === "progress") {
				if (a.progress >= 100 && b.progress >= 100) {
					if (a.challenge.currentLevel != b.challenge.currentLevel) {
						return levels.indexOf(a.challenge.currentLevel) - levels.indexOf(b.challenge.currentLevel) * (sort_order === "asc" ? 1 : -1);
					} else {
						return a.progress - b.progress * (sort_order === "asc" ? -1 : 1);
					}
				}
				return (b.progress - a.progress) * (sort_order === "asc" ? -1 : 1);
			//}
		});

		if (hide_masters) {
			props_challenges = props_challenges.filter(c => c.challenge.pointsAwarded < 100 && c.challenge.currentValue < c.target_threshold);
		}

		return props_challenges;
	}, [static_data.lcu_data, hide_masters, hide_legacy, search, sort_by, sort_order, hide_capstone, progress_mode, selected_tag_filters, challenge_tag_assignments]);

	return (
		<>
			<div className="p-6 space-y-6">
				<div className="flex items-center gap-4 flex-wrap">
					<div className="relative">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search Challenges..."
							className="pl-8 w-[200px]"
							value={search}
							onChange={(e) => set_search(e.target.value)}
						/>
					</div>

					<Select onValueChange={(field) => { set_sort_by(field as "name" | "progress") }} value={sort_by}>
						<SelectTrigger className="w-[160px]">
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="name">Name</SelectItem>
							<SelectItem value="progress">Progress</SelectItem>
						</SelectContent>
					</Select>

					<Button
						variant="outline"
						size="icon"
						onClick={() => {
							set_sort_order(prev => prev === 'asc' ? 'desc' : 'asc');
						}}
						title={`Sort ${sort_order === 'asc' ? 'Ascending' : 'Descending'}`}
					>
						{sort_order === 'asc' ? (
							<ArrowUp className="h-4 w-4" />
						) : (
							<ArrowDown className="h-4 w-4" />
						)}
					</Button>

					<Select onValueChange={(mode) => { set_progress_mode(mode as ProgressMode) }} value={progress_mode}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Progress target" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="next">To Next Level</SelectItem>
							<SelectItem value="master">To Master Tier</SelectItem>
						</SelectContent>
					</Select>

					<TagFilterDropdown
						tags={tags}
						selected_tags={selected_tag_filters}
						set_selected_tags={set_selected_tag_filters}
					/>

					<Button variant="outline" onClick={() => set_tags_dialog_open(true)}>
						<Tag className="h-4 w-4" />
						Manage Tags
					</Button>

					<div className="flex items-center gap-2">
						<Checkbox id="hide-masters" checked={hide_masters} onCheckedChange={(checked) => set_hide_masters(checked as boolean)} />
						<Label htmlFor="hide-masters" className="text-sm cursor-pointer">
							Hide Masters+
						</Label>
					</div>

					<div className="flex items-center gap-2">
						<Checkbox id="hide-legacy" checked={hide_legacy} onCheckedChange={(checked) => set_hide_legacy(checked as boolean)} />
						<Label htmlFor="hide-legacy" className="text-sm cursor-pointer">
							Hide Legacy
						</Label>
					</div>

					<div className="flex items-center gap-2">
						<Checkbox id="hide-capstone" checked={hide_capstone} onCheckedChange={(checked) => set_hide_capstone(checked as boolean)} />
						<Label htmlFor="hide-capstone" className="text-sm cursor-pointer">
							Hide Capstones
						</Label>
					</div>
				</div>

				{selected_tag_filters.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{selected_tag_filters.map(tag => (
							<Badge key={tag} variant="secondary" className="gap-1">
								{tag}
								<button
									type="button"
									onClick={() => set_selected_tag_filters(prev => prev.filter(t => t !== tag))}
									className="ml-1 rounded-sm hover:text-foreground"
								>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						))}
						<Button variant="ghost" size="sm" onClick={() => set_selected_tag_filters([])}>
							Clear Tag Filters
						</Button>
					</div>
				)}

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{filtered_challenges.map(challenge => (
						<ChallengeCard
							key={challenge.challenge.id}
							challenge={challenge}
							progress_mode={progress_mode}
							tags={tags}
							on_toggle_tag={toggle_challenge_tag}
						/>
					))}
				</div>
			</div>

			<Dialog open={tags_dialog_open} onOpenChange={set_tags_dialog_open}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Manage Tags</DialogTitle>
						<DialogDescription>
							Create tags to organize challenges and filter them on this page.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="flex gap-2">
							<Input
								placeholder="New tag name"
								value={new_tag_name}
								onChange={(e) => set_new_tag_name(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										create_tag();
									}
								}}
							/>
							<Button onClick={create_tag} disabled={!can_create_tag}>
								<Plus className="h-4 w-4" />
								Create
							</Button>
						</div>

						{normalized_new_tag_name.length > 0 && !can_create_tag && (
							<div className="text-xs text-muted-foreground">
								Tag names must be unique.
							</div>
						)}

						<div className="space-y-2 max-h-[320px] overflow-y-auto">
							{tags.length === 0 ? (
								<div className="text-sm text-muted-foreground">No tags created yet.</div>
							) : (
								tags.map(tag => {
									const assigned_count = Object.values(challenge_tag_assignments).filter(assigned_tags => assigned_tags.includes(tag)).length;

									return (
										<div key={tag} className="flex items-center justify-between rounded-md border p-2">
											<div className="min-w-0">
												<div className="font-medium text-sm">{tag}</div>
												<div className="text-xs text-muted-foreground">
													Assigned to {assigned_count} challenge{assigned_count === 1 ? "" : "s"}
												</div>
											</div>
											<Button variant="ghost" size="icon" onClick={() => delete_tag(tag)}>
												<X className="h-4 w-4" />
											</Button>
										</div>
									);
								})
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
