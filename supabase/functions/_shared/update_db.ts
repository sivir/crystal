// using deno since supabase uses deno
import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts";
const database_url = Deno.env.get("SUPABASE_DB_URL");
const riot_api_key = Deno.env.get("RIOT_API_KEY");
const supabase_secret = Deno.env.get("APP_SECRET");
const pool = new postgres.Pool(database_url, 3, true);
const cors_headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-secret",
};

const region_to_platform: { [key: string]: string } = {
    br: "br1",
    eune: "eun1",
    euw: "euw1",
    jp: "jp1",
    kr: "kr",
    la1: "la1",
    la2: "la2",
    na: "na1",
    oc: "oc1",
    tr: "tr1",
    ru: "ru",
    ph: "ph2",
    sg2: "sg2",
    th: "th2",
    tw: "tw2",
    vn: "vn2",
};

type RiotAccount = {
    puuid: string;
    gameName?: string;
    tagLine?: string;
};

async function get_riot_account_by_riot_id(
    riot_id: string,
): Promise<RiotAccount> {
    const [game_name, tag_line] = riot_id.split("#");

    if (!game_name || !tag_line) {
        throw new Error("riot_id must be in the format gameName#tagLine");
    }

    if (!riot_api_key) {
        throw new Error("Missing Riot API key");
    }

    const response = await fetch(
        `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(game_name)}/${encodeURIComponent(tag_line)}`,
        { headers: { "X-Riot-Token": riot_api_key } },
    );

    if (!response.ok) {
        throw new Error(
            `Riot account lookup failed with status ${response.status}`,
        );
    }

    return (await response.json()) as RiotAccount;
}

async function update_riot_data(id: string, region: string, riot_id: string) {
    console.log("update_riot_data id: ", id, " region: ", region);
    const platform = region_to_platform[region] ?? region;
    const challenge_response = await fetch(
        `https://${platform}.api.riotgames.com/lol/challenges/v1/player-data/${id}?api_key=${riot_api_key}`,
    );
    const mastery_response = await fetch(
        `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${id}?api_key=${riot_api_key}`,
    );
    const summoner_response = await fetch(
        `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${id}?api_key=${riot_api_key}`,
    );
    const [challenge_data, mastery_data, summoner_data] = await Promise.all([
        challenge_response.json(),
        mastery_response.json(),
        summoner_response.json(),
    ]);
    await update_db_riot_data(
        id,
        challenge_data,
        mastery_data,
        summoner_data,
        riot_id,
    );
    return {
        challenge: challenge_data,
        mastery: mastery_data,
        summoner: summoner_data,
    };
}

async function update_db_riot_data(
    id: string,
    challenge_data: any,
    mastery_data: any,
    summoner_data: any,
    riot_id: string,
) {
    const connection = await pool.connect();
    const time = new Date();
    await connection.queryObject`INSERT INTO users (id, riot_data, last_update_riot, mastery_data, summoner_data, riot_id)
	                                 VALUES (${id}, ${challenge_data}, ${time}, ${mastery_data}, ${summoner_data}, ${riot_id}) ON CONFLICT (id) DO
    UPDATE
	        SET (riot_data, last_update_riot, mastery_data, summoner_data, riot_id) = (${challenge_data}, ${time}, ${mastery_data}, ${summoner_data}, ${riot_id})`;
    connection.release();
}

async function detect_region(puuid: string): Promise<string> {
    try {
        const res = await fetch(
            `https://americas.api.riotgames.com/riot/account/v1/region/by-game/lol/by-puuid/${puuid}`,
            { headers: { "X-Riot-Token": riot_api_key } },
        );
        if (res.ok) {
            const data = await res.json();
            const detected = data.region?.toLowerCase();
            console.log(detected);
            if (detected) return detected;
        }
    } catch (_e) {}
    return "na1";
}

async function update_db_lcu_data(id: string, data: any) {
    const connection = await pool.connect();
    const user = await get_user(id);
    if (user.length === 0) {
        const region = await detect_region(id);
        await update_riot_data(id, region, "");
    }
    const time = new Date();
    // update lcu data and time for user without inserting
    await connection.queryObject`UPDATE users
                                 SET (lcu_data, last_update_lcu) = (${data}, ${time})
                                 WHERE id = ${id}`;
    connection.release();
}

async function get_user(id: string): Promise<any[]> {
    const connection = await pool.connect();
    const res =
        await connection.queryObject`SELECT * FROM users WHERE id = ${id}`;
    console.log("get_user res", res);
    connection.release();
    return res.rows;
}

async function update_db_riot_id(id: string, riot_id: string) {
    const connection = await pool.connect();
    await connection.queryObject`UPDATE users SET riot_id = ${riot_id} WHERE id = ${id}`;
    connection.release();
}

export {
    cors_headers,
    update_db_riot_data,
    get_user,
    update_riot_data,
    update_db_lcu_data,
    update_db_riot_id,
    riot_api_key,
    supabase_secret,
    region_to_platform,
    get_riot_account_by_riot_id,
    detect_region,
};
