// challenge ids for the pages

export const ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID = 101301; // aram s-
export const ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID = 602002; // arena wins

export const TRACKED_CHAMPION_CHALLENGES = [
	ALL_RANDOM_ALL_CHAMPIONS_CHALLENGE_ID,
	120002,
	202303,
	210001,
	210002,
	401106,
	505001,
	ADAPT_TO_ALL_SITUATIONS_CHALLENGE_ID,
	602001,
];

// m7 class challenges, in order (Assassin, Fighter, Mage, Marksman, Support, Tank)
export const M7_CHALLENGES = [401201, 401202, 401203, 401204, 401205, 401206];

// m10 class challenges, same order
export const M10_CHALLENGES = [401207, 401208, 401209, 401210, 401211, 401212];

// mastery of your 150th highest for table highlighting
export const CATCH_EM_ALL_CHALLENGE_ID = 401101;

// single-pool mastery challenges (counts across all champions / points on one)
export const MASTER_YOURSELF_CHALLENGE_ID = 401104; // M5 on different champions
export const ONE_TRICK_CHALLENGE_ID = 401103; // mastery points on a single champion
export const MASTER_ENEMY_LEGACY_CHALLENGE_ID = 401105; // M7 on different champions
export const MASTER_ENEMY_CHALLENGE_ID = 401107; // M10 on different champions

// general mastery progression challenges
export const MASTERY_HEADLINE_CHALLENGES = [CATCH_EM_ALL_CHALLENGE_ID, 401104, 401102, 401105, 401103, 401107];

// skin challenges
export const SKIN_CHALLENGES = {
	total: 510001,
	champions_15plus: 510003,
	champions_5plus: 510004,
	legacy: 510005,
	victorious: 510006,
	ultimate: 510007,
	mythic: 510008,
	legendary: 510009,
	epic: 510010,
} as const;

// the challenge where you have to filter by role
export const VARIETYS_OVERRATED_CHALLENGE_ID = 303408;
