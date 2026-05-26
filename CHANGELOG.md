# Changelog

## 0.7.5 - 2026-05-26

- Fix mirror toolbar「点亮屏幕」after turn-off: read exposed `displayScreenOn` with `unref` (`.value ?? true` always treated screen as on)
- Screen on sends only `SET_DISPLAY_POWER` on; drop client POWER wake to avoid toggling display off again when server power-on succeeds

## 0.7.4 - 2026-05-26

- Fix mirror toolbar only working on first click: navigation uses pointer down/up (one scrcpy phase per event) instead of paired DOWN+UP on click
- Toolbar hold matches phone: press sends key DOWN, release sends UP; global pointerup/blur releases stuck keys; back uses inject keycode

## 0.7.3 - 2026-05-26

- Mirror cast toolbar: navigation keys (recents, home, back, power, volume, rotate) send scrcpy-style DOWN+UP pairs so buttons work reliably
- Toolbar refactor: `useDeviceWorkspaceToolbar`, action `kind` metadata; screenshot downloads PNG when device is online (no cast required); Shift+click volume for volume-down

## 0.7.2 - 2026-05-26

- Fix mirror audio section stuck disabled on load: default `audio.disabled` to false (web cast ships audio with video)
- Fix「禁用音频」switch locked when section grayed; toggle always available so users can re-enable audio without toggling「禁用视频」first

## 0.7.1 - 2026-05-26

- Mirror cast settings UI rebuilt with Naive UI (`NCollapse`, `NForm`, `NSwitch`, `NAlert`, theme provider synced with app light/dark)
- All mirror dropdowns use `MirrorSearchableSelect`: search box fixed at the top of the menu (grouped options supported, e.g. new-display presets)
- Settings layout: one option per row, help via `?` tooltip; removed separate in-form app search row (filter in start-app dropdown)
- Simplified flat panel styles (`mirror-settings.css`); left cast panel uses Naive buttons/alerts

## 0.7.0 - 2026-05-26

- Mirror「屏幕」settings aligned with escrcpy: grouped `--new-display` presets, custom resolution/DPI, `--flex-display`, `--no-vd-destroy-content`, `--no-vd-system-decorations`, `--display-ime-policy`
- Web cast: use `NewDisplayCapture` when `new_display` is in stream extras; defer pipeline start until ws type 101; recreate `Controller` on display config change so `--start-app` launches on the virtual display (not main display 0)
- Stream extras: `start_app`, `new_display` (incl. main-size empty value), `vd_system_decorations`; server schedules start-app after virtual display is ready (5s wait + retries)
- Frontend: `serializeStartApp` control message; auto start app after connect; `build-scrcpy-server.mjs` auto-picks JDK 17+ from Program Files\\Java
- Fix compile error in `WsCastSession.restartControl`; fix type-101 soft reconfigure NPE via `SurfaceEncoder.requestCaptureReset`

## 0.6.9 - 2026-05-26

- Fix web cast startup crash: soft-reconfigure on ws type 101 instead of full pipeline restart; video+audio PCM with delayed audio start
- Fix show_touches stuck on: always send `show_touches=true/false` and sync system setting on device
- Fix display power toggle (screen off/on); enable `--turn-screen-off` in mirror settings; POWER key fallback on server
- Lock mirror settings UI with overlay while casting (no hot-reload during session)
- Video+audio: browser PCM playback via `WsScrcpyAudioPlayback`; `audio_dup` aligned with scrcpy (playback source, Android 13+ only)
- UI/server guard: disable `audio-dup` and `playback` source when device SDK below 33 (Android 12 devices keep output capture, speakers muted)

## 0.6.8 - 2026-05-26

- Align mirror「音频」settings with escrcpy: `--no-audio`, `--audio-dup`, `--audio-source`, combined `--audio-code`, bitrate presets, buffer fields (web ignores playback buffers)
- `GET /video-encoders` also returns device audio encoders; UI builds `audio-code` options from device list + fallback
- Stream extras: `audio_codec`, `audio_encoder`, `audio_bit_rate`, `audio_source`, `audio_dup`; server `Options.applyStreamExtraPair` applies them for web cast

## 0.6.7 - 2026-05-26

- Enable mirror「禁用视频」for audio-only web cast: PCM over WebSocket (`scrcpy_audio`), canvas waveform + playback via Web Audio
- Server: `WsPcmAudioProcessor`, `WsPcmSender`; `WsCastSession` audio-only pipeline; stream extras `video=false` / `audio=true`
- Fix `WsPcmSender` ByteBuffer read for Android (`get(dst, offset, length)`)

## 0.6.6 - 2026-05-26

- Fix mirror display orientation ignored on web cast: tolerate stream extras in VideoSettings codecOptions (capture_orientation, show_touches, etc.) instead of failing MediaCodec parse
- Clarify UI: capture orientation vs preview-only canvas rotation

## 0.6.5 - 2026-05-26

- Fix video encoder list stuck loading during cast: use `adb exec-out` for `list_encoders`, drop global adb lock, add timeouts, logcat fallback, and generic encoder fallback
- Frontend: 25s fetch timeout for `/video-encoders`; show warning when fallback list is used
- Expand mirror cast settings aligned with escrcpy/scrcpy 4.0 (crop, display orientation, virtual display presets, keep-active, screen-off-timeout, IME policy) via WebSocket type 101 `codecOptions` extras
- Server: parse stream extras (`crop`, `new_display`, `show_touches`, `keep_active`, etc.) in `Options.copyForWebStream`

## 0.6.4 - 2026-05-26

- List real device video encoders (`GET /video-encoders`) with `H264 - name` / `H265 - name` labels; first item is default (no separate “auto” entry)
- Split mirror-options from encoder query so settings UI loads in seconds instead of blocking on adb push + list_encoders
- Reject codec ids (e.g. `h264`) as encoder names; cache encoder list and skip jar push when already on device

## 0.6.3 - 2026-05-26

- Unify mirror video settings across UI, cast API, and ws-scrcpy type 101 (resolution long-edge map, bitrate, fps, encoder, display, capture orientation)
- Apply capture orientation on device via `copyForWebStream`; hot-reload video parameters while casting
- Add preview-only canvas rotation; clarify web cast video UI hints

## 0.6.2 - 2026-05-26

- Fix web cast black screen: align Annex-B WebCodecs player with ws-scrcpy (decode P-frames after first IDR, not only the first keyframe)
- Fix WebSocket proxy race: prefetch client messages during shell startup, queue until device WS is open, retry device connect

## 0.6.1 - 2026-05-26

- Make custom scrcpy WebSocket server report version `4.0` for compatibility with the official scrcpy desktop client
- Kill leftover device scrcpy server processes before starting web cast to avoid `8886` bind conflicts
- Harden ws-scrcpy control handling (filter invalid payloads; send initial VideoSettings on connect)

## 0.6.0 - 2026-05-26

- Add WebSocket cast mode to official scrcpy 4.0 server fork (`4.0-ws1`) in `backend/source/scrcpy` (device-side WS on port 8886, ws-scrcpy wire protocol)
- Add `tools/build-scrcpy-server.mjs`; backend auto-builds `scrcpy-server` via Gradle when missing (`ensureScrcpyServerBuilt`)
- Proxy browser WebSocket to device; Annex-B H.264 player and touch/control over single `/cast/ws`
- Fix redundant `cast/stop` when no backend session; only stop after successful `cast/start`

## 0.5.4 - 2026-05-25

- Replace ADB screenshot MJPEG cast with scrcpy H.264 WebSocket streaming (ws-scrcpy style)
- Add device cast API: `POST/DELETE /api/devices/:serial/cast/start|stop`, WebSocket `/cast/ws`
- Add WebCodecs canvas player in device workspace right panel
- Add `tools/download-scrcpy.mjs`; `build-scrcpy.mjs` auto-downloads official prebuilt when Meson is missing

## 0.5.3 - 2026-05-25

- Add default device cast preview in workspace right panel (start/stop buttons wired)
- Add `GET /api/devices/:serial/cast/stream` MJPEG stream via ADB screencap; left mirror settings not applied yet

## 0.5.2 - 2026-05-25

- Add new-display toggle on mirror cast screen settings; disable existing display picker when enabled

## 0.5.1 - 2026-05-25

- Fix device workspace layout: only left settings panel scrolls, not the whole page
- Widen left cast settings column (24–28rem)

## 0.5.0 - 2026-05-25

- Add mirror cast settings form (video, audio, device, screen) in device workspace left panel
- Add `GET /api/devices/:serial/mirror-options` for displays, apps, encoders, and audio sources
- Fix duplicate `defineEmits()` in AppSidebar

## 0.4.2 - 2026-05-25

- Add device workspace left panel with cast mode selector and start/stop cast buttons
- Reserve middle section for future controls; narrow left column layout

## 0.4.1 - 2026-05-25

- Add icons to device workspace toolbar buttons (icon left of label)

## 0.4.0 - 2026-05-25

- Add device workspace view opened from gallery cards
- Top toolbar with Android control action buttons (UI only); left/right panes reserved for future content

## 0.3.7 - 2026-05-25

- Split device list (1s) and screenshot (5s) refresh timers
- Keep previous gallery and screenshot visible during background updates without loading animation

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
