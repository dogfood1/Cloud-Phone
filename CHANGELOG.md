# Changelog

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
