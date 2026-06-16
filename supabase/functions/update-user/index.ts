import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { update_db_lcu_data, cors_headers, riot_api_key } from '../_shared/update_db.ts';

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: cors_headers });
	}

	const x = await req.json();
	const { riot_id, data } = x;

	try {
		const id = riot_id.split("#");
		const summoner_response = await fetch(`https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${id[0]}/${id[1]}?api_key=${riot_api_key}`);
		const summoner_data = await summoner_response.json();
		console.log(summoner_data);
		const puuid = summoner_data.puuid;
		await update_db_lcu_data(puuid, data);
		return new Response('ok', { headers: cors_headers });
	} catch (err) {
		console.error(err);
		const message = err instanceof Error ? err.message : String(err);
		return new Response(message, { status: 500, headers: cors_headers });
	}
});