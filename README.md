# Crystal

warning: this app won't update mastery points in real time if you compile it
yourself since there is a compile-time secret for function authentication that
are not included in this repo, to stop malicious actors from modifying the
database. this will be removed later once user's are required to log in via RSO
(almost no effort to the user)

desktop client to help you keep track of your league challenges! screenshots
incoming

uses tauri with rust and react, typescript, and shadcn/ui with tailwind

special thanks to sylv for help with
[irelia](https://github.com/AlsoSylv/irelia)

Crystal isn't endorsed by Riot Games and doesn't reflect the views or opinions
of Riot Games or anyone officially involved in producing or managing Riot Games
properties. Riot Games, and all associated properties are trademarks or
registered trademarks of Riot Games, Inc.

```mermaid
---
title: System Architecture
---
flowchart TD
    subgraph External["External Services"]
        LCU["League Client (LCU API)"]
        RIOT["Riot API\n(challenges, mastery)"]
        CDRAGON["CommunityDragon CDN\n(champions, skins, statstones)"]
    end

    subgraph Supabase["Supabase"]
        EDGE["Edge Function\n(get-user)"]
        PG["PostgreSQL\n(users table)"]
        EDGE <--> PG
        EDGE <--> RIOT
    end

    subgraph Tauri["Tauri Desktop App"]
        subgraph Rust["Rust Backend"]
            LCU_REST["LCU REST Client\n(irelia)"]
            LCU_WS["LCU WebSocket\n(irelia)"]
            CONN_LOOP["Connection Loop\n(5s poll + health check)"]
            CMDS["Tauri Commands\n(lcu_request, http_request,\nget_connected)"]
            TRAY["System Tray\n(show/hide, quit)"]
        end

        subgraph Frontend["React Frontend"]
            MAIN["main.tsx\n(providers)"]
            APP["App.tsx\n(data fetching & events)"]
            CTX_STATIC["StaticDataContext\n(challenges, mastery, champions,\nskins, eternals, loot)"]
            CTX_SESSION["SessionDataContext\n(champ select, gameflow)"]
            LAYOUT["Layout\n(sidebar, titlebar)"]
            PAGES["Pages\n(Home, Mastery, Lobby, Profile,\nSkins, Eternals, Team Builder,\nSettings, Debug, User)"]
        end
    end

    LCU <-->|REST via irelia| LCU_REST
    LCU -->|WebSocket subscriptions| LCU_WS
    CONN_LOOP -->|manages| LCU_REST
    CONN_LOOP -->|manages| LCU_WS
    CONN_LOOP -->|emits connection/lcu-refresh| APP

    LCU_WS -->|"emits champ-select,\ngameflow events"| APP
    CMDS <-->|"Tauri IPC\n(invoke)"| APP

    APP -->|"invoke http_request"| CDRAGON
    APP -->|"supabase-js\n(functions.invoke)"| EDGE
    APP -->|updates| CTX_STATIC
    APP -->|updates| CTX_SESSION
    CTX_STATIC --> PAGES
    CTX_SESSION --> PAGES
    MAIN --> LAYOUT --> APP
```

```mermaid
---
title: Data Refresh Pipeline (refresh_data)
---
flowchart TD
    START(["refresh_data() triggered"]) --> CHECK{Connected?}
    CHECK -->|No| SKIP["Skip refresh\nsetLoading(false)"]
    CHECK -->|Yes| PARALLEL

    subgraph PARALLEL["Phase 1 — Parallel Requests"]
        direction LR
        P1["LCU: /lol-challenges/v1/\nchallenges/local-player\n→ lcu_data"]
        P2["LCU: /lol-summoner/v1/\ncurrent-summoner\n→ summoner info"]
        P3["LCU: /lol-loot/v2/\nplayer-loot-map\n→ loot_data"]
    end

    P2 --> REGION["LCU: /riotclient/\nregion-locale"]
    REGION --> SUPA_AND_SKINS

    subgraph SUPA_AND_SKINS["Concurrent Sub-Requests"]
        direction LR
        SUPA["Supabase get-user\n(riot_id + region)\n→ riot_data, mastery_data"]
        SKINS["LCU: /lol-champions/v1/\ninventories/.../skins-minimal\n→ minimal_skins"]
    end

    SUPA --> MASTERY_CHECK{"Supabase returned\nmastery data?"}
    MASTERY_CHECK -->|Yes| USE_DB["Use database\nmastery_data"]
    MASTERY_CHECK -->|No| LCU_MASTERY["Fallback: LCU\n/lol-champion-mastery/v1/\nlocal-player/champion-mastery"]

    PARALLEL --> PHASE2

    subgraph PHASE2["Phase 2 — Sequential After Phase 1"]
        ETERNALS["Per-champion eternals\n/lol-statstones/v2/\nplayer-statstones-self/{id}\n(one request per champion)"]
    end

    PHASE2 --> DONE["setLoading(false, 100)"]
```

```mermaid
---
title: Supabase Edge Function (get-user)
---
flowchart TD
    REQ["Client Request\n(riot_id, region)"] --> AUTH{"x-secret\nheader valid?"}
    AUTH -->|"No (logged, not blocked)"| CONTINUE
    AUTH -->|Yes| CONTINUE

    CONTINUE --> RIOT_ACCOUNT["Riot API:\nGET /riot/account/v1/accounts/\nby-riot-id/{name}/{tag}\n→ puuid"]

    RIOT_ACCOUNT --> DB_CHECK{"User exists\nin PostgreSQL?"}

    DB_CHECK -->|No| FETCH_FRESH["Riot API:\nGET challenges + mastery\nfor puuid"]
    FETCH_FRESH --> INSERT["INSERT into users table"]
    INSERT --> RETURN_FRESH["Return fresh\nriot_data + mastery_data"]

    DB_CHECK -->|Yes| STALE_CHECK{"Last update\n> 10 min ago?"}
    STALE_CHECK -->|Yes| FETCH_UPDATE["Riot API:\nGET challenges + mastery"]
    FETCH_UPDATE --> UPDATE["UPDATE users table"]
    UPDATE --> RETURN_UPDATED["Return updated\nriot_data + mastery_data\n+ cached lcu_data"]

    STALE_CHECK -->|No| RETURN_CACHED["Return cached\nriot_data + mastery_data\n+ lcu_data"]
```

![alt text](image.png)
![alt text](image-1.png)
![alt text](image-2.png)
![alt text](image-3.png)
![alt text](image-4.png)