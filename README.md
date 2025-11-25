# Crystal

warning: this app won't update mastery points in real time if you compile it yourself since there is a compile-time secret for function authentication that are not included in this repo, to stop malicious actors from modifying the database. this will be removed later once user's are required to log in via RSO (almost no effort to the user)

desktop client to help you keep track of your league challenges! screenshots incoming

uses tauri with rust and react, typescript, and shadcn/ui with tailwind

special thanks to sylv for help with [irelia](https://github.com/AlsoSylv/irelia)

Crystal isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.


```mermaid
---
title: App Design Chart
---
flowchart TD
    A[League of Legends Client API] <-->|irelia| B(Rust Backend)
    B <-->|Tauri| C(Javascript Backend)
    C <--> D[Supabase Database]
    C <--> E[React Frontend]
    C <--> F[Riot API]
```

```mermaid
---
title: Champions Display Function Example
---
flowchart LR
    A[League of Legends Client API] -->|/lol-challenges/v1/challenges/local-player/| B(Rust Backend)
    B --> D
    C[Riot API] -->|/lol/champion-mastery/v4/champion-masteries/by-puuid/| D(Javascript Processing)
    D --> E[React Table]
```

## Changelog

0.6.0
- added team builder

0.5.0
- added eternals tracker

0.4.0
- added skin tracker
- added authentication to supabase functions
- minor ui tweaks

0.3.0
- added custom status
- added challenge icon editor
- added tooltips to homepage challenge icons

0.2.0
- added functionality to automatically track available champions in aram and crowd favorites for arena and display relevant challenge progress

0.1.0
- initial release
