# Sun & Moon

Run `npm start`, then visit http://localhost:3000 in two tabs. Create a room in one and enter its code in the other. Each tab controls its own traveler. No dependencies or API keys required. Requires Node.js 20+.

Move: A/D or arrows. Jump: W, Up, or Space. Power: hold E at your matching shrine to keep a bridge active. Your partner crosses and presses E at the far anchor to secure it. Later anchors require jumping onto platforms. Respawn: R. Alternate roles across each gap, then stand on two separate exit switches simultaneously. Both players must reach the exit. Three levels, two optional fragments per level, shared level progression and personal checkpoints. The game pauses if either player disconnects; refreshing the same tab reconnects its session.

## Hosting on Vercel

The Vercel deployment serves public/ and routes /api/* to api/game.js. A dedicated Upstash Redis store holds room state with atomic compare-and-swap updates, so independent Function instances cannot overwrite simultaneous inputs. Connect the store to the project through Vercel Storage; its KV_REST_API_URL and KV_REST_API_TOKEN stay server-side. No credentials are included in source.

Hosted clients synchronize over short HTTP requests, with smoothed character rendering, presence checks, and automatic retries. Rooms and progression expire after 24 hours without activity. Closing a tab pauses play after the presence timeout; Home leaves immediately and frees a seat. Rejoining the same tab restores its session. Unlocked levels and best star counts persist for the room, and selecting a level moves both players.

The free Redis plan has a monthly command allowance; continuous play consumes that allowance. npm test verifies all level routes and cloud room concurrency/progression. npm start retains the original dependency-free in-memory local server. Long-distance players should use the deployed HTTPS address, not localhost.

This prototype does not yet include movable objects, separate heated terrain, or lunar barriers.

## Database usage safeguards

Hosted waiting rooms and completed levels check every 3 seconds. Active play checks no faster than 120 ms after a response. Hidden tabs send no synchronization requests, and visible tabs stop after 60 seconds without keyboard or canvas input. Return with Resume; there is no automatic reconnection just from opening the tab again. Temporary failures back off exponentially up to 30 seconds, stop after eight failures, and requests time out after 10 seconds. Quota, authorization and missing-room errors stop immediately. Quota errors also open a five-minute server-instance circuit breaker to reduce traffic from older clients. Already-open older tabs must refresh to receive these safeguards. Active play still consumes the free database command allowance.
