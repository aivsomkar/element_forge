# Element Forge

Be Tony Stark for five minutes. A webcam-controlled holographic "new element" experience inspired by the discovery scene in *Iron Man 2* — raise your hands to the camera and shape a glowing element in the air.

Built with React + Three.js, using MediaPipe hand tracking over a live AR-passthrough webcam background.

## The experience

One continuous "expansion" dial, driven by how far apart your hands are:

- **Close your hands** → a tiny, eye-sized glowing orb (a holographic globe with continents)
- **Spread your hands** → the land dissolves, the globe becomes an energy sphere, then blooms into a huge hollow sphere of atoms
- Each atom is a spiky glowing nucleus sitting in its own **magnetic dipole field**, with electrons orbiting it
- Fine sparkle dust drifts around the whole thing

### Gestures

| Gesture | Action |
| --- | --- |
| 🤲 Spread / bring together both open hands | Grow / shrink + morph the element |
| 🤏 Pinch one hand | Grab and move the element around (palm size = depth) |
| 🔄 Twist two pinched hands | Rotate it |
| 👋 Flick one open hand | Spin it |
| ✊ Fist | Stop the spin |

Mouse fallback: drag to rotate, scroll to expand — so it works without a webcam.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Allow camera access, then press **Begin**. Best with both hands visible and good lighting.

```bash
npm run build    # type-check + production bundle
npm run preview  # serve the production build
```

## Stack

- React 19 + Vite + TypeScript
- Three.js (custom render pipeline: SMAA, additive holographic materials)
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) — webcam hand landmark tracking
- Zustand for state

## How it works

- `src/lib/handTracking.ts` — runs the webcam + MediaPipe hand landmarker, emits landmark frames
- `src/lib/gestureRecognizer.ts` — turns landmark frames into pinch / two-hand / twist / swipe / fist gestures
- `src/three/createElement.ts` — the morphing holographic element (globe → energy core → atom sphere with magnetic fields)
- `src/components/ElementScene.tsx` — wires gestures to the element (expansion dial, grab/move, spin)

The hand-tracking pipeline is adapted from the PinViz project.
