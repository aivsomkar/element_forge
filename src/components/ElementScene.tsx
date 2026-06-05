import { useEffect, useRef } from 'react';
import { Group, Vector3 } from 'three';
import { createScene } from '../three/createScene';
import { createElement } from '../three/createElement';
import { handTracker } from '../lib/handTracking';
import { GestureRecognizer } from '../lib/gestureRecognizer';
import { useElementStore } from '../store/elementStore';

// --- Expansion mapping (two-hand spread → globe↔atom dial) ---
const SPREAD_MIN = 0.14; // hands together (normalized inter-hand distance)
const SPREAD_MAX = 0.55; // hands wide apart
const EXPANSION_LERP = 0.12; // smoothing toward the target each frame

// --- Grab / move ---
const GRAB_MIN_DIST = 3.5;
const GRAB_MAX_DIST = 12;
const HOME = new Vector3(0, 0, 0);
const HOME_LERP = 0.04; // drift back home when released

// --- Spin ---
const SWIPE_GAIN = 0.7;
const SPIN_FRICTION = 0.94;
const SPIN_MAX = 0.14;
const IDLE_SPIN = 0.0016;
const TWIST_GAIN = 1.5;

export function ElementScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bundle = createScene(canvas);
    const { scene, camera, composer, resize } = bundle;
    camera.position.set(0, 0, 7.5);
    camera.lookAt(0, 0, 0);

    const holder = new Group(); // movable position of the floating element
    scene.add(holder);
    const element = createElement();
    holder.add(element.root);

    const report = useElementStore.getState().report;

    // ---- Interaction state ----
    let targetExpansion = 0;
    let expansion = 0;
    const spinVel = { x: 0, y: 0 };
    let bob = 0;
    let grabbed: { hand: 'Left' | 'Right'; grabSpan: number; grabDistance: number } | null = null;

    const rayDir = new Vector3();
    const ndcToRayDir = (px: number, py: number): Vector3 => {
      rayDir.set(px * 2 - 1, 1 - py * 2, 0.5).unproject(camera).sub(camera.position).normalize();
      return rayDir;
    };

    // ---- Hand gestures ----
    const recognizer = new GestureRecognizer();
    const unsubFrames = handTracker.onFrame((frame) => {
      const events = recognizer.process(frame);
      for (const ev of events) {
        if (ev.type === 'twoHandMove') {
          // Absolute spread → expansion dial. Closing hands collapses to a small atom; spreading
          // grows the globe into the full atomic structure.
          if (grabbed) continue;
          const t = (ev.distance - SPREAD_MIN) / (SPREAD_MAX - SPREAD_MIN);
          targetExpansion = Math.min(1, Math.max(0, t));
        } else if (ev.type === 'twoHandTwist') {
          if (grabbed) continue;
          element.root.rotation.y += ev.angleDelta * TWIST_GAIN;
        } else if (ev.type === 'pinchStart') {
          // Grab the element out of the air to move it around.
          const worldPos = holder.getWorldPosition(new Vector3());
          grabbed = {
            hand: ev.hand,
            grabSpan: Math.max(ev.span, 1e-3),
            grabDistance: camera.position.distanceTo(worldPos),
          };
        } else if (ev.type === 'pinchMove') {
          if (grabbed && grabbed.hand === ev.hand) {
            const span = Math.max(ev.span, 1e-3);
            const distance = Math.min(
              GRAB_MAX_DIST,
              Math.max(GRAB_MIN_DIST, grabbed.grabDistance * (grabbed.grabSpan / span)),
            );
            const dir = ndcToRayDir(ev.pointer.x, ev.pointer.y);
            holder.position.copy(camera.position).addScaledVector(dir, distance);
          }
        } else if (ev.type === 'pinchEnd') {
          if (grabbed && grabbed.hand === ev.hand) grabbed = null;
        } else if (ev.type === 'swipe') {
          if (grabbed) continue;
          spinVel.y = Math.max(-SPIN_MAX, Math.min(SPIN_MAX, spinVel.y + ev.velocity.x * SWIPE_GAIN));
          spinVel.x = Math.max(-SPIN_MAX, Math.min(SPIN_MAX, spinVel.x + ev.velocity.y * SWIPE_GAIN));
        } else if (ev.type === 'fist') {
          spinVel.x = 0;
          spinVel.y = 0;
        }
      }
    });

    // ---- Mouse fallback (so it works without a webcam) ----
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      spinVel.y = Math.max(-SPIN_MAX, Math.min(SPIN_MAX, dx * 0.0025));
      spinVel.x = Math.max(-SPIN_MAX, Math.min(SPIN_MAX, dy * 0.0025));
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetExpansion = Math.min(1, Math.max(0, targetExpansion - e.deltaY * 0.0011));
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => resize(window.innerWidth, window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);

    // ---- Render loop ----
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const time = (performance.now() - start) / 1000;

      // Smooth the expansion dial.
      expansion += (targetExpansion - expansion) * EXPANSION_LERP;
      element.update(expansion, time);
      report(expansion);

      // Orientation: idle drift + decaying swipe/twist momentum.
      element.root.rotation.y += spinVel.y + IDLE_SPIN;
      element.root.rotation.x += spinVel.x;
      spinVel.x *= SPIN_FRICTION;
      spinVel.y *= SPIN_FRICTION;
      if (Math.abs(spinVel.x) < 1e-5) spinVel.x = 0;
      if (Math.abs(spinVel.y) < 1e-5) spinVel.y = 0;

      // Gentle hologram float; drift back home when not held.
      bob = Math.sin(time * 1.3) * 0.06;
      element.root.position.y = bob;
      if (!grabbed) holder.position.lerp(HOME, HOME_LERP);

      // Hover the element toward whichever hand is pointing (subtle parallax).
      composer.render();
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      unsubFrames();
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      element.dispose();
      bundle.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
        zIndex: 1,
        background: 'transparent',
        cursor: 'grab',
        touchAction: 'none',
      }}
    />
  );
}
