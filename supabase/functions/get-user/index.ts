import {
    cors_headers,
    get_user,
    get_riot_account_by_riot_id,
    update_riot_data,
    update_db_riot_id,
    supabase_secret,
    detect_region,
} from "../_shared/update_db.ts";

Deno.serve(async (req) => {
    // allow calling from browser
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: cors_headers,
        });
    }
    // check if secret matches, dont actually need this for reads only writes later
    if (req.headers.get("x-secret") !== supabase_secret) {
        console.log("Unauthorized");
        // return new Response('Unauthorized', {
        // 	status: 401,
        // 	headers: cors_headers
        // });
    }
    // extract id from request
    const x = await req.json();
    const { riot_id, region: passed_region } = x;
    try {
        // check if user exists in db
        console.log("get-user on id: ", riot_id);
        const account_data = await get_riot_account_by_riot_id(riot_id);
        const puuid = account_data.puuid;
        const actual_name = account_data.gameName ?? riot_id.split("#")[0];
        const actual_tag = account_data.tagLine ?? riot_id.split("#")[1];

        // auto-detect region from puuid
        const region = await detect_region(puuid);

        const res = await get_user(puuid);
        console.log("id: ", riot_id, " res: ", res);
        // if not, update db with riot data
        if (res.length === 0) {
            const data = await update_riot_data(puuid, region, riot_id);
            return Response.json(
                {
                    riot_data: data["challenge"],
                    mastery_data: data["mastery"],
                    summoner_data: data["summoner"],
                    lcu_data: {},
                    gameName: actual_name,
                    tagLine: actual_tag,
                    region,
                },
                {
                    headers: cors_headers,
                },
            );
        } else {
            // check when riot data was last updated
            const last_updated = new Date(res[0].last_update_riot);
            const now = new Date();
            const diff = now.getTime() - last_updated.getTime();
            // if it's been 10 minutes, update it
            if (diff > 10 * 60 * 1000) {
                const data = await update_riot_data(puuid, region, riot_id);
                return Response.json(
                    {
                        riot_data: data["challenge"],
                        mastery_data: data["mastery"],
                        summoner_data: data["summoner"],
                        lcu_data: res[0].lcu_data,
                        gameName: actual_name,
                        tagLine: actual_tag,
                        region,
                    },
                    {
                        headers: cors_headers,
                    },
                );
            } else {
                await update_db_riot_id(puuid, riot_id);
                return Response.json(
                    {
                        riot_data: res[0].riot_data,
                        mastery_data: res[0].mastery_data,
                        summoner_data: res[0].summoner_data,
                        lcu_data: res[0].lcu_data,
                        gameName: actual_name,
                        tagLine: actual_tag,
                        region,
                    },
                    {
                        headers: cors_headers,
                    },
                );
            }
        }
    } catch (err) {
        console.error(err);
        return new Response(String(err), {
            status: 500,
            headers: cors_headers,
        });
    }
});
