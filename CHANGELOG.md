# Changelog

## 0.3.6 - 2026-05-25

- Vendor scrcpy source under `backend/source/scrcpy` with Cloud Phone config/capabilities hooks
- Add backend scrcpy service, session API (`/api/scrcpy/*`), and cross-platform build/sync scripts
- Document scrcpy/ws-scrcpy network streaming and capability mapping for programmatic control

## 0.3.5 - 2026-05-25

- Fix device panel props by unwrapping `useDevices` refs at App root (fixes Vue prop warnings)
- Wait for backend `/health` before starting Vite in `npm run dev`
- Improve Vite API proxy timeout, startup health check, and backend connection error messages

## 0.3.4 - 2026-05-25

- Enrich device gallery with real ADB fields (manufacturer, Android/SDK, serial, product)
- Add device summary toolbar, manual refresh, last sync time, and online/offline counts
- Sort devices with connected units first; improve screenshot error and offline placeholders

## 0.3.3 - 2026-05-25

- Remove console overview page; default to devices tab
- Tune sidebar tab height for balanced compact layout
- Add `.cursor/skills/ui-ux-pro-max` for Cursor UI/UX design skill

## 0.3.2 - 2026-05-25

- Redesign UI with ui-ux-pro-max design system (Space Grotesk, DM Sans, glass cards)
- Add SVG icon set, improved sidebar, device cards, and auth modals
- Refine light/dark theme contrast, hover states, and accessibility focus styles

## 0.3.1 - 2026-05-25

- Add light/dark theme toggle in the bottom-left sidebar and login screen
- Persist theme preference in localStorage with CSS variable-based styling

## 0.3.0 - 2026-05-25

- Migrate frontend to Vite + Vue 3 SFC with composables and components
- Add console overview tab and fix post-login UI not switching from auth layer
- Add root `npm run dev` to start backend and frontend together
- Serve production frontend from `dist/` via `npm run build` + `npm run start`

## 0.2.5 - 2026-05-25

- Redesign frontend with left sidebar tabs for devices and settings
- Add device gallery cards with live screenshots, device name, and IP address
- Add configurable screenshot refresh interval in settings (default 5 seconds)
- Add `GET /api/devices/:serial/screenshot` and device IP enrichment via ADB

## 0.2.4 - 2026-05-25

- Remove left-side icons from login and forced password change modal headers
- Align auth modal titles flush left with `auth-modal__header--plain`

## 0.2.3 - 2026-05-25

- Fix forced password change flow skipping login and reporting incorrect current password
- Add root `.env` configuration for separate backend and frontend ports
- Split frontend and backend into independent dev servers with API proxy
- Add root npm scripts `dev:backend` and `dev:frontend`

## 0.2.0 - 2026-05-25

- Add `GET /api/devices` backend endpoint for device discovery
- Query connected Android devices through the bundled ADB binary
- Return device serial, state, model, manufacturer, Android version, and SDK version
- Add `tools/version_manager.py` to keep frontend and backend versions aligned

## 0.1.0 - 2026-05-25

- Initialize Node.js backend workspace in `backend/node`
- Add a basic HTTP server entry
- Add a health check endpoint
- Sync frontend and backend versions to `0.1.0`

## 0.0.1 - 2026-05-25

- Initialize repository structure
- Add frontend version file
- Add backend version file
- Add README and ignore rules
