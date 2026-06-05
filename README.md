# Element Forge

[**✦ Built with Bluey Lite**](https://www.trybluey.com/products/bluey-lite) · [**Join the Discord**](https://discord.com/invite/SndB4Psg)

**Be Tony Stark for five minutes.**

Element Forge is a webcam-controlled holographic experience inspired by the "new element" discovery scene in *Iron Man 2* — the moment Tony grabs a glowing projection of the city, strips it down, and watches it bloom into the atomic structure of a brand-new element. This recreates that feeling in the browser: raise your hands to your webcam and shape a glowing element in the air with nothing but gestures.

No controller, no mouse required — just your hands and a camera.

---

## The story

This whole project was built from a **single YouTube video** of the Iron Man 2 scene. Using [Bluey](https://bluey.com) to capture visual context straight from the video — pointing at the screen and saying *"make something like this"* — Claude Code turned those reference frames into a working app, one piece of feedback at a time: the globe, the atom sphere, the spiky nuclei, the magnetic fields, the electrons. Vision in, working software out.

---

## The experience

Everything is driven by **one continuous "expansion" dial** — and that dial is just *how far apart your hands are*.

1. **Hands closed → a tiny, eye-sized orb.** A holographic globe with glowing continents and a lat/long grid, small enough to hold between two fingers.
2. **Start spreading → the world peels apart.** The continents dissolve away, leaving a clean, pulsing **energy sphere**.
3. **Keep spreading → it blooms into the element.** The energy core hollows out and a huge sphere of **atoms** forms — and it keeps growing, larger and larger, until it nearly surrounds you.

Each atom on that sphere is its own little world: a **spiky glowing nucleus** sitting inside a **magnetic dipole field** (curved field-line loops arcing out and back), with **electrons orbiting** around it. Fine sparkle dust drifts through the whole structure.

Because the webcam shows through behind the 3D canvas (AR passthrough), the element appears to float in the room right in front of you.

### Gestures

| Gesture | Action |
| --- | --- |
| 🤲 Spread / bring together **both open hands** | Grow / shrink the element and morph it (globe ↔ atom sphere) |
| 🤏 Pinch **one hand** | Grab the element out of the air and move it around (move your hand toward the camera to pull it closer) |
| 🔄 Twist **two pinched hands** | Rotate the element |
| 👋 Flick **one open hand** | Spin it with momentum |
| ✊ Make a **fist** | Stop the spin |

**Mouse fallback:** drag to rotate, scroll to expand — so the whole thing still works without a webcam.

---

## Run it locally

```bash
npm install
npm run dev      # → http://localhost:5173
```

Open the URL, **allow camera access**, and press **Begin**. Works best with both hands visible and good lighting.

```bash
npm run build    # type-check + production bundle
npm run preview  # serve the production build
```

Deploys as a static site anywhere (Vercel auto-detects the Vite build).

---

## How it's built

**Stack:** React 19 · Vite · TypeScript · [Three.js](https://threejs.org) · [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) (hand tracking) · Zustand (state).

The app is intentionally small and layered. Each file does one thing:

### Hand tracking (input)
- **`src/lib/handTracking.ts`** — starts the webcam, loads the MediaPipe hand-landmark model, and emits a stream of per-frame 3D hand landmarks. The video element is mirrored and shown full-screen as the AR background.
- **`src/lib/gestureRecognizer.ts`** — pure logic that turns raw landmarks into gestures: pinch start/move/end, two-hand spread, two-hand twist, swipe, and fist. No Three.js, no React — easy to reason about and test.

### The element (visuals)
- **`src/three/createElement.ts`** — the heart of the project. Builds the morphing holographic element and exposes a single `update(expansion, time)` call that drives the entire transformation:
  - the **globe** (ocean point-cloud + procedural continents + lat/long grid),
  - the **energy core** (a fresnel-glowing sphere that rises and then hollows out),
  - the **atom sphere** (~160 atoms on a Fibonacci sphere; each a spiky nucleus + dipole magnetic field lines `ρ = L·sin²θ` + electrons orbiting on the equatorial plane),
  - the **sparkle field** (fine drifting, twinkling dust).
  - All glow comes from **additive materials and sprites** rather than a bloom pass, so the transparent AR background stays intact.
- **`src/three/createScene.ts`** — the transparent Three.js scene/renderer/composer (SMAA antialiasing, ACES tone mapping), set up so the webcam shows through.

### Wiring it together
- **`src/components/ElementScene.tsx`** — the bridge. Maps the gesture stream onto the element: two-hand spread → the expansion dial, pinch → grab & move, twist → rotate, swipe → spin momentum. Also holds the mouse fallback and the render loop.
- **`src/components/CameraLayer.tsx`** — owns the webcam lifecycle and the on-screen gesture cheat-sheet.
- **`src/components/StartOverlay.tsx` / `StageHud.tsx`** — the intro veil and the live stage readout (Globe → Energy Core → New Element).
- **`src/store/`** — small Zustand stores for hand-tracking status and the current expansion/stage.

The webcam hand-tracking pipeline (`handTracking`, `gestureRecognizer`, `CameraLayer`) is adapted from the **PinViz** project, which already used MediaPipe + Three.js for hand-controlled 3D.

---

## Tuning

Most of the look lives in `src/three/createElement.ts` as named constants — easy to play with:

- `fibonacciSphere(160)` — number of atoms on the sphere
- `FIELD_LINES`, `L` — magnetic field-line count and reach
- `ELECTRONS` — electrons orbiting each nucleus
- `lerp(0.12, 4.2, e)` (in `update`) — min (tiny orb) and max (huge) size
- `SPREAD_MIN` / `SPREAD_MAX` (in `ElementScene.tsx`) — how far you spread your hands to go from collapsed to full

---

*Built with [Claude Code](https://claude.com/claude-code), from a YouTube video, via Bluey.*
