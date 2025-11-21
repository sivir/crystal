// using deno since supabase uses deno
import * as postgres from 'https://deno.land/x/postgres@v0.17.0/mod.ts';
const database_url = Deno.env.get('SUPABASE_DB_URL');
const riot_api_key = Deno.env.get('RIOT_API_KEY');
const supabase_secret = Deno.env.get('APP_SECRET');
const pool = new postgres.Pool(database_url, 3, true);
const cors_headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-secret'
};

const region_to_platform : { [key: string]: string } = {
	"br": "br1",
	"eune": "eun1",
	"euw": "euw1",
	"jp": "jp1",
	"kr": "kr",
	"la1": "la1",
	"la2": "la2",
	"na": "na1",
	"oc": "oc1",
	"tr": "tr1",
	"ru": "ru",
	"ph": "ph2",
	"sg": "sg2",
	"th": "th2",
	"tw": "tw2",
	"vn": "vn2"
}

async function update_riot_data(id: string, region: string) {
	console.log("update_riot_data id", id);
	const challenge_response = await fetch(`https://${region_to_platform[region]}.api.riotgames.com/lol/challenges/v1/player-data/${id}?api_key=${riot_api_key}`);
	const challenge_data = await challenge_response.json();
	const mastery_response = await fetch(`https://${region_to_platform[region]}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${id}?api_key=${riot_api_key}`);
	const mastery_data = await mastery_response.json();
	await update_db_riot_data(id, challenge_data, mastery_data);
	return {
		"challenge": challenge_data,
		"mastery": mastery_data
	};
}

async function update_db_riot_data(id: string, challenge_data: any, mastery_data: any) {
	const connection = await pool.connect();
	const time = new Date();
	await connection.queryObject`INSERT INTO users (id, riot_data, last_update_riot, mastery_data)
                                 VALUES (${id}, ${challenge_data}, ${time}, ${mastery_data}) ON CONFLICT (id) DO
    UPDATE
        SET (riot_data, last_update_riot, mastery_data) = (${challenge_data}, ${time}, ${mastery_data})`;
	connection.release();
}
async function update_db_lcu_data(id: string, data: any) {
	const connection = await pool.connect();
	const user = await get_user(id);
	if (user.length === 0) {
		await update_riot_data(id, "na");
	}
	const time = new Date();
	// update lcu data and time for user without inserting
	await connection.queryObject`UPDATE users
                                 SET (lcu_data, last_update_lcu) = (${data}, ${time})
                                 WHERE id = ${id}`;
	connection.release();
}
async function get_user(id: string) {
	const connection = await pool.connect();
	const res = await connection.queryObject`SELECT * FROM users WHERE id = ${id}`;
	console.log("get_user res", res);
	connection.release();
	return res.rows;
}
export { cors_headers, update_db_riot_data, get_user, update_riot_data, update_db_lcu_data, riot_api_key, supabase_secret };
