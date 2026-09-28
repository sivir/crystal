// Popular lanes per champion, powering the same Top/Jungle/Mid/Bot/Support
// filter you see during champ select.
//
// Source: internal LCU plugin `rcp-fe-lol-champion-statistics` (mirrored by
// CommunityDragon RAW). It embeds a JSON blob of play-rates per position:
//   {"TOP":{"266":0.029...},"JUNGLE":{...},"MIDDLE":{...},"BOTTOM":{...},"SUPPORT":{...}}
// A champion appears under a lane filter iff it has an entry for that lane.
// There is no official Riot API / Data Dragon equivalent (those only expose
// class tags like Mage/Support).

export const lanes = ["Top", "Jungle", "Mid", "Bot", "Support"] as const;
export type Lane = (typeof lanes)[number];

export type ChampionPositionMap = {
	[id: number]: Lane[];
};

export const CHAMPION_STATISTICS_URL =
	"https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champion-statistics/global/default/rcp-fe-lol-champion-statistics.js";

// Raw position keys used inside the statistics blob -> UI lane labels.
// UTILITY is the match-API name for what the client calls SUPPORT.
const raw_position_to_lane: Record<string, Lane> = {
	TOP: "Top",
	JUNGLE: "Jungle",
	MIDDLE: "Mid",
	MID: "Mid",
	BOTTOM: "Bot",
	BOT: "Bot",
	ADC: "Bot",
	SUPPORT: "Support",
	UTILITY: "Support",
	SUP: "Support",
};

/** Invert the `{ POSITION: { championId: playRate } }` blob into `{ championId: Lane[] }`. */
export function positions_blob_to_map(blob: Record<string, Record<string, number>>): ChampionPositionMap {
	const map: ChampionPositionMap = {};
	for (const [raw_position, entries] of Object.entries(blob ?? {})) {
		const lane = raw_position_to_lane[raw_position.toUpperCase()];
		if (!lane || !entries || typeof entries !== "object") continue;
		for (const champion_id of Object.keys(entries)) {
			const id = Number(champion_id);
			if (!Number.isFinite(id)) continue;
			const existing = map[id] ?? [];
			if (!existing.includes(lane)) existing.push(lane);
			map[id] = existing;
		}
	}
	// Keep lane order stable (Top -> Support) for display.
	const order = new Map(lanes.map((lane, i) => [lane, i]));
	for (const id of Object.keys(map)) {
		map[Number(id)]!.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
	}
	return map;
}

/**
 * Extract the embedded `JSON.parse('...')` play-rate blob from the
 * `rcp-fe-lol-champion-statistics.js` plugin source and convert it to a
 * champion -> lanes map. Returns `{}` on any parse failure so callers can
 * safely fall back to "no lane data".
 */
export function parse_champion_statistics_js(js_source: string): ChampionPositionMap {
	if (!js_source || typeof js_source !== "string") return {};
	// The blob is embedded as JSON.parse('{"TOP":{...},...}') — single or double quoted.
	const match = js_source.match(/JSON\.parse\(\s*(['"])(\{.*?\})\1\s*\)/s);
	if (!match) return {};
	try {
		const blob = JSON.parse(match[2]) as Record<string, Record<string, number>>;
		return positions_blob_to_map(blob);
	} catch {
		return {};
	}
}

/** Fetch live lane data from CommunityDragon RAW. Never throws — returns `{}` on failure. */
export async function fetch_champion_positions(): Promise<ChampionPositionMap> {
	try {
		const response = await fetch(CHAMPION_STATISTICS_URL);
		if (!response.ok) return {};
		const text = await response.text();
		return parse_champion_statistics_js(text);
	} catch (error) {
		console.error("Error fetching champion lane data:", error);
		return {};
	}
}

export function get_champion_lanes(champion_id: number, map: ChampionPositionMap | undefined | null): Lane[] {
	if (!map) return [];
	return map[champion_id] ?? [];
}
