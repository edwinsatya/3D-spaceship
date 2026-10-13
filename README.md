# Space Explorer 3D (Jelajah Angkasa 3D)

A 3D space exploration game that runs straight in the browser on desktop and phones, with nothing to install.
The full specification is in [`PRD.md`](PRD.md) (Indonesian); assets and their licences are listed in
[`ASSETS.md`](ASSETS.md).

**Planet textures:** [Solar System Scope](https://www.solarsystemscope.com/textures/),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (converted to WebP; see the in-game Credits screen and `ASSETS.md`).

**Languages:** English (default, `DEFAULT_LOCALE` in `game/i18n/types.ts`) and Indonesian, switchable in
Settings → Language & privacy.

**Status:** all four phases of the PRD are done.

- **Phase 1 (core loop):** flight model, the *Orbit Rings* mission, menu/HUD, onboarding hints, procedural audio,
  automatic quality.
- **Phase 2 (planets & hangar):** Solar System map and warp, orbiting, Encyclopedia, landing on the Moon and Mars,
  Hangar with 4 ships and paint/decals/engine trails.
- **Phase 3 (adventure, progress & accounts):**
  - 7 missions on 5 routes: Earth orbit, space station, Jupiter, asteroid belt (Ceres), Saturn's rings.
  - Photo mode and a local gallery.
  - Star-based unlocks and 11 badges.
  - Optional Supabase accounts with cross-device progress sync.
  - Best-time leaderboards for the timed missions, validated on the server.
- **Phase 4 (settings, sound & polish):**
  - Settings screen: separate volumes and an engine sound per ship, graphics presets (with sun shadows on Medium
    and High) and an FPS counter, key remapping, sensitivity, invert Y, gamepad and tilt steering.
  - Accessibility: reduce motion, colour-blind friendly colours, text size.
  - Release: language picker, installable PWA with offline play, anonymous analytics, Credits screen.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3001. Both `dev` and `start` use port 3001, because 3000 is often taken by other projects.
You need Node.js ≥ 20.9 and a browser with WebGL2.

| Script              | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Development server (Turbopack) on port 3001        |
| `npm run build`     | Production build                                   |
| `npm run start`     | Serve the production build on port 3001            |
| `npm run typecheck` | Generate Next route types + `tsc --noEmit`         |
| `npm run lint`      | ESLint (Next + React Hooks rules)                  |
| `npm run test`      | Vitest for the pure game logic                     |
| `npm run check`     | typecheck + lint + test                            |

### Environment variables

| Variable | Needed for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional accounts and analytics (see below) |
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs in share previews (Open Graph), e.g. `https://your-game.vercel.app` |

Copy `.env.example` to `.env.local` for local development, and set the same variables in your host (e.g. Vercel →
Settings → Environment Variables). `NEXT_PUBLIC_` values are inlined at build time, so redeploy after changing them.

### Accounts (optional, Supabase)

Without configuration the game is guest-only, and progress stays on the device. To enable accounts:

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/20261013000000_player_progress.sql` in the SQL Editor (or `supabase db push`).
   `player_progress` uses Row Level Security: each player can only read and write their own row.
3. **Authentication → Providers**: enable *Email* (magic links) and *Google*. Google needs a Client ID and Secret
   from the Google Cloud Console; the redirect URI to register there is shown on Supabase's Google provider page.
4. **Authentication → URL Configuration**: set the *Site URL*, and add every URL the game runs on (for example
   `http://localhost:3001` and your production domain) to *Redirect URLs*.
5. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API keys; use
   the publishable key, never the secret key), then restart `npm run dev`.

On the first sign-in, guest progress is merged into the account: best records, stars, discoveries and badges, and
the newest ship loadout wins. After that, progress uploads about 2.5 s after each change and is pulled again when
the tab regains focus. Device settings (sound, language, graphics, controls, accessibility) never leave the device.
Photos stay in the device's gallery.

### Analytics (optional)

Run `supabase/migrations/20261013010000_analytics_events.sql` as well to receive anonymous gameplay events:

- `game_start`
- `tutorial_complete`
- `mission_complete`
- `session_end` (seconds on screen)

Events carry only a random per-tab session id, with no account or personal data. The table is insert-only through
the API, so you read it from the dashboard. Players can turn sharing off in Settings, and it starts off when the
browser sends Do Not Track or Global Privacy Control. Without Supabase, events are only logged to the console in
development.

### Leaderboards (optional)

Run `supabase/migrations/20261013020000_leaderboard.sql` to turn on best-time leaderboards for the five timed
missions (photo scores are worked out on the device, so they have no board). In **Missions**, a timed mission has a
*Leaderboard* tab; guests can look, and signed-in players post their times.

- **Server-side checks.** The game asks for a run ticket when a mission starts and hands it back with the time at
  the finish (`leaderboard_start_run` / `leaderboard_submit_run`). The server refuses a time that is faster than
  the mission's plausible minimum (about 55% of the best autopilot run, `game/config/leaderboard.ts`), longer than
  its own clock says has passed since the ticket, a ticket that is reused, someone else's or over an hour old, and
  more than 40 tickets in 5 minutes. This stops times typed into the console; like any browser game, it can't fully
  stop a modified client.
- **Privacy.** Players appear as a call sign made from word lists ("Swift Comet 42"), stored as three numbers and
  shown in each player's language. There is no free text and no email or real name on the board. Players can roll a
  new call sign on the leaderboard or in the Account panel.
- **Access.** Scores and tickets have no API policies; they are only reached through the functions above, and
  `leaderboard_top` returns ranks without user ids.

### Installing / offline

The game is a PWA. Browsers offer "Install" or "Add to Home Screen", and after the first visit it plays offline
(`public/sw.js`, production builds only). When textures or icons change under the same file name, bump `VERSION`
in `public/sw.js` so returning players get the new files.

## Controls

All keyboard keys can be remapped in Settings → Controls. The defaults are:

| Desktop | Phone (landscape) | Gamepad | Action |
| --- | --- | --- | --- |
| Mouse (no pointer lock) | Left stick | Left stick | Steer towards the cursor/stick |
| Arrow keys | — | — | Alternative steering |
| W / S | Right lever | RT / LT | Throttle up / down |
| A / D | — (auto-level) | LB / RB | Roll |
| Shift / Space | BOOST button | A | Boost (limited energy) |
| C | ⇄ button | Y | Chase ⇄ cockpit camera |
| Tab | Map button | View | Solar System map → warp (free flight, not on a surface) |
| F | **Orbit** button (near a planet) | X | Enter/leave orbit + planet info card |
| L | **Land / Take off** button | B | Land on the Moon or Mars; other worlds explain why not |
| V | Camera button (top right) | R3 | Photo mode: drag to look, scroll/pinch to move the camera, Space = shutter, H = hide controls |
| Esc / P | Pause button | Menu | Pause / resume |
| M | Sound button | — | Sound on/off |

Settings → Controls also has steering sensitivity, invert up/down, and tilt steering for phones (beta; recentres at
the start of each run).

## Architecture

```
app/                 layout (SEO metadata), page (server shell), manifest, opengraph-image, icons
game/
  GameRoot.tsx       next/dynamic(ssr:false) → GameApp (Canvas + UI layer)
  config/            ALL tuning numbers (flight, camera, missions, quality, audio, HUD, visuals, settings, palette)
  data/              planets.ts (Sun, 8 planets, Ceres, Moon: facts in EN/ID), solarSystem.ts (map & lighting),
                     surfaces.ts (landing sites), ships.ts (4 ships, palettes, engine voices), missions.ts (routes,
                     missions, courses), station.ts, photoTargets.ts, unlocks.ts, badges.ts, credits.ts, facts.ts
  i18n/              en (default; source of the dictionary type) + id, typed t(); metadata/OG use DEFAULT_LOCALE
  stores/            Zustand: game (state machine), session (mission UI), progress (persisted, synced to the
                     account), settings (persisted, device-only), quality, loading, asset, ui (overlays), photo, account
  controls/          keyboard+mouse (remappable), touch, gamepad, gyro → one ControlInput; tuning (sensitivity, invert)
  systems/           pure logic (flight, boost, collision, course, mission, scoring, hints, floating origin,
                     environment, warp, orbit, discovery, landing, terrain, shipConfig, objectives, photo, unlocks,
                     badges, scenery, station, accessibility, analytics, autopilot for balance tests,
                     account/merge+sync) + runtime (mutable per-frame state), simulation, GameLoop (one useFrame)
  entities/          ship/, planet/ (PlanetBody, SunBody, atmosphere, on-demand textures), surface/ (landing-site props),
                     Earth, Moon, Sun, Station, Rings, MissionProps, EnergyStars, Asteroids
  scenes/            SpaceScene, surface/ (terrain + Moon/Mars skies), warp tunnel, layered sky, dust, effects,
                     quality, photo capture, preloader + GPU bakes
  audio/             procedural synthesis (per-ship engines) + Howler manager with a 4-channel mix
  ui/                loading, menu, HUD, pause, results, touch controls, map/, hangar/, encyclopedia/, missions/,
                     photo/, gallery/, badges/, account/, leaderboard/, settings/, credits/
public/              textures/ (WebP), icons/ (PWA), sw.js (offline)
supabase/migrations/ progress table + RLS, analytics table (insert-only), leaderboards (server-checked RPCs)
```

Key principles:

- **State machine** `boot → loading → menu ⇄ hangar → playing ⇄ paused / map / photo → result`
  (`game/systems/stateMachine.ts`).
- **One location per scene.** Each warp destination (the Sun, the planets, Ceres) is its own scene; the Moon lives
  in the Earth scene. The Moon and Mars surfaces are separate small scenes behind a fade, not a seamless landing.
- **One loop per frame** (`GameLoop`, priority −1): input → flight → collisions → missions → camera → transforms →
  HUD. Nothing is allocated and no React state is set per frame; the HUD writes straight to the DOM.
- **Floating origin.** Gameplay positions are universe coordinates; rendering subtracts an `origin` that is rebased
  when the ship travels far (`WORLD.floatingOriginThreshold`).
- **Artistic scale.** Earth has a radius of 200 u; real numbers only appear as text.
- **Settings apply instantly.** Every setting is read live: the store drives the audio mix, quality tier, input
  tuning, CSS variables (colours, text size) and the reduce-motion flag, with no reload.
- **Debug handle** (development builds, or production builds with `NEXT_PUBLIC_E2E=1`): `window.__game` exposes the
  runtime, the stores, `r3f()` and `photoSubject()` for debugging and tests.

## Manual test checklist

**Desktop (latest Chrome / Edge / Firefox / Safari)**

1. **Loading and title.** Loading screen (progress + facts) → 3D title screen. **Missions** lists 7 missions by
   route; locked ones show the stars they need.
2. **Orbit Rings.** Countdown, 12 rings, energy stars, bumping asteroids (no game over). The result screen shows
   stars, time, **New unlocks!**, and a **Badge earned!** toast at the bottom left.
3. **Free flight.**
   - Fly to the Moon: discovery banner, **F** to orbit, **L** to land at the Sea of Tranquility.
   - Visit the Apollo 11 site, the crater and the Earthrise view, then **L** to take off.
   - Press **Tab** and warp to Mars: atmospheric entry, Jezero Crater.
   - Warp to a gas giant and press **L**: an explanation of why you can't land.
4. **Mission types.**
   - *Station Delivery*: tow cargo pods through the docking ring.
   - *Storm Portrait*: press **V**, frame the Great Red Spot, press Space.
   - Belt and Saturn missions, *Crystal Hunt*.
5. **Hangar, Gallery, Badges, Encyclopedia.**
   - Locked ships and colours show a padlock.
   - Picking a ship revs its engine.
   - Gallery: download, share and delete photos.
6. **Settings.** Every change applies immediately and survives a reload.
   - **Sound:** volume sliders.
   - **Display:** Low/Medium/High/Auto (shadows under the ship on Medium and High, none on Low), FPS counter.
   - **Controls:** rebind a key (Esc cancels), sensitivity, invert Y; a gamepad is detected and shown.
   - **Accessibility:** reduced motion (no shake or FOV kick), colour-blind palette (ring dots turn blue), large text.
   - **Language & privacy:** switch to Indonesian, analytics toggle.
7. **Account** (person icon on the title screen): sign in with Google or an email link; the sync status appears and
   progress follows you to another device.
   - **Leaderboard:** Missions → a timed mission → *Leaderboard*. As a guest you see the board and a sign-in prompt;
     signed in, finish the mission and the result screen shows your rank. *New name* rolls a new call sign.
8. **Credits** (bottom right of the title screen).
9. **Lifecycle.** Switching tabs pauses the game. Install the PWA, go offline, reload: the game still starts.

**Phone (Android Chrome / iOS Safari, landscape)**

1. Portrait shows a "rotate your phone" prompt; landscape shows the title. Starting a run goes fullscreen (Android).
2. Joystick under the left thumb, throttle lever on the right, BOOST button. Orbit, Land and Take off buttons appear
   when relevant; the top-right buttons are photo, map, ⇄ camera, sound and pause.
3. Settings → Controls → **Tilt steering**: iOS asks for motion access; tilting steers; **Recenter** resets the pose.
4. Cards, banners and hints don't cover the joystick or the lever; all overlays scroll.

## Automated tests

`npm run test` (Vitest) covers:

- **Flight and race logic:** scoring and star ratings, mission timers (including pause), the state machine, boost
  energy, the flight model and auto-level, collisions, and course generation (ring crossing without tunnelling).
- **Balance:** an autopilot flies every mission with every ship using the real flight model. A clean pilot earns
  two stars, and three stars need boost.
- **Phase 2 systems:** warp, orbit, discovery, per-location environments, ship config, landing sequences and terrain.
- **Layout checks:** rocks, crystals, cargo pods and the station are kept apart and out of the race corridors.
- **Phase 3 and 4 logic:** photo scoring and filter matrices, unlocks and badges, guest/account progress merge and
  sync (with a fake remote), the settings store (sanitising, migration from old saves, key rebinding), gamepad
  input, accessibility, and per-ship engine sounds (seamless loops).
- **Leaderboards:** the minimum times and call sign ranges match the SQL migration, the minimums stay below the
  autopilot's best runs, server responses are parsed safely, and the ticket → submit flow (guests, refusals,
  offline, restarts) runs against a fake backend.
- **i18n:** the English and Indonesian dictionaries have exactly the same keys.

Visual checks use Playwright (a devDependency) against a production build made with `NEXT_PUBLIC_E2E=1`. That
flag enables `window.__game`, so scripts can step the simulation deterministically (`frameloop="never"` +
`advance`).
