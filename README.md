# Sun & Moon

A two-player cooperative platformer. One player creates a room; the other joins with its six-character code. Sun and Moon alternate holding bridges and securing anchors, collect stars, and finish each level together. Six scrolling chapters grow from 2,200 to 5,200 world units, with three to eight cooperative crossings, raised anchors, jump hazards and shared checkpoints. Each camera follows its own traveler; a minimap and edge markers locate the other player.

## Run locally

Use Node.js 20 or newer. Run `npm ci` then `npm start`; open http://localhost:3000 on two devices or tabs. Move with A/D or arrow keys, jump with Space/W/Up, use power with E, respawn with R. Each client has its own tab session. Home leaves the room. Complete levels sequentially; either player can replay unlocked levels for both.

## Hosting

- Vercel serves `public/` and a configuration-only endpoint. Set `GAME_SERVER_URL` to the Render service's `wss://…/ws` address.
- Render runs `npm start` as one Node web service. The included `render.yaml` declares a free single-service deployment. Never scale to multiple instances without introducing explicit room routing.
- The server keeps rooms and progression in memory. No Redis SDK, database, or database credentials are used. Restarts, redeploys and free-tier sleep clear rooms.
- All old `/api/sync`, `/api/input`, `/events` and other polling routes return 410 without accessing a database. Existing old deployments are immutable: their routes/credentials must be separately revoked or disabled if they need to be retired.

## How realtime works

Browsers connect with WebSockets. Inputs are sent when keys change; a 60 Hz authoritative simulation runs on the server. Changed snapshots are pushed at up to 30 Hz. No periodic HTTP sync or database writes occur. An empty server has no simulation timer.

Each socket authenticates with a random per-player token. Snapshots and structured event logs omit tokens. Logs include connection IDs, actions and client version `ws-1` for diagnosis. Only the configured `ALLOWED_ORIGINS` may connect from browsers. Health checks at `/health` don't create rooms. Rooms and per-connection message rates are bounded.

Hidden/idle tabs close their socket and require Resume. Clients use bounded reconnect attempts after unexpected network failures. Server heartbeat checks remove dead connections; disconnected seats are reserved for five minutes. Abandoned rooms expire. These safeguards reduce bandwidth and CPU use; they do not depend on a database quota.

The free Render service may sleep when inactive and take time to wake. Its free compute/bandwidth limits still apply. There is no always-on guarantee and no saved progress after a process restart.

## Tests

`npm test` runs movement-driven solutions for all six scrolling levels and real socket integration tests for shared movement, level changes, invalid origins, authentication, capacity, disconnect/resume, token privacy, leave and disabled legacy endpoints.
