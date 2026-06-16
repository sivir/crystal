// using deno since supabase uses deno
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { cors_headers, riot_api_key } from '../_shared/update_db.ts';

serve(async (req) => {
	// allow calling from browser
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: cors_headers });
	}

	try {
		const data = await fetch(`https://na1.api.riotgames.com/lol/challenges/v1/challenges/config?api_key=${riot_api_key}`);
		const challenge_data = await data.json();
		console.log(challenge_data);
        return new Response(JSON.stringify(challenge_data), { headers: cors_headers });
    } catch (err) {
		console.error(err);
		const message = err instanceof Error ? err.message : String(err);
		return new Response(message, { status: 500, headers: cors_headers });
	}
});