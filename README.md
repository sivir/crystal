# Crystal

desktop client to help you keep track of your league challenges! screenshots incoming

uses tauri, react, tailwind, shadcn, typescript, and v0

special thanks to sylv for help with [irelia](https://github.com/AlsoSylv/irelia)

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

![screenshot](screenshots/champions.png "champions table")
![screenshot](screenshots/eternals.png "eternals")
![screenshot](screenshots/team_builder.png "team builder")

## todo

- [ ] set search filters
- [ ] take screenshots
- [ ] add globes, seasonal, and token setter to home
- [ ] add tooltips to auto globe multisearch
- [ ] add aram champ select tracker
- [x] fix column visibility in champion table
- [ ] add seasonal mark of mastery tracker
- [ ] add counts to team builder
- [ ] eternals up to 15 (math with 10x the 5th milestone count)
- [x] potential issue if people have eternals finished on legacy eternals
- [x] eternals per champion role
- [ ] add eternals summary to top of eternals page
- [ ] improve comparison
- [ ] skin challenge tracker
