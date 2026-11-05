# Sun & Moon

<img width="1398" height="798" alt="Screenshot 2026-11-04 at 10 32 13 PM" src="https://github.com/user-attachments/assets/c3f79eff-2ebc-440f-b91c-3c18109dec8e" />

### Gameplay Instructions:
- Move: A/D or arrows.
- Jump: W, Up, or Space.
- Power: hold E at your matching shrine to keep a bridge active.
- Your partner crosses and presses E at the far anchor to secure it. Later anchors require jumping onto platforms.
- Respawn: R. Alternate roles across each gap, then stand on two separate exit switches simultaneously.
- Both players must reach the exit to complete a level
- There are three levels currently, two optional fragments per level, shared level progression and personal checkpoints.
- The game pauses if either player disconnects; refreshing the same tab reconnects its session.

### Local testing:
- Run `npm start`, then visit http://localhost:3000 in two separate tabs. 
- Create a room in one and enter corresponding code in the other.
- Each tab controls its own traveler. No dependencies or API keys required.
- Requires Node.js 20+.

<img width="1158" height="732" alt="Screenshot 2026-11-04 at 10 34 44 PM" src="https://github.com/user-attachments/assets/f93cb690-aea5-4130-a8a6-cc3c52ed5ec1" />

### Hosting on Vercel

The Vercel deployment serves public/ and routes /api/* to api/game.js. 

A dedicated Upstash Redis store holds room state with atomic compare-and-swap updates, so independent Function instances cannot overwrite simultaneous inputs. Connect the store to the project through Vercel Storage; its KV_REST_API_URL and KV_REST_API_TOKEN stay server-side - no credentials are included in source.

Hosted clients synchronize over short HTTP requests, with smoothed character rendering, presence checks, and automatic retries. Rooms and progression expire after 24 hours without activity. Closing a tab pauses play after the presence timeout; Home leaves immediately and frees a seat. 

Rejoining the same tab restores its session. Unlocked levels and best star counts persist for the room, and selecting a level moves both players.

Note: the free Redis plan has a monthly command allowance; continuous play consumes that allowance. npm test verifies all level routes and cloud room concurrency/progression. npm start retains the original dependency-free in-memory local server. Long-distance players should use the deployed HTTPS address, not localhost.

### Future improvements
This prototype does not yet include movable objects, separate heated terrain, or lunar barriers.
