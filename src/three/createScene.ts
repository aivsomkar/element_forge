import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  ACESFilmicToneMapping,
  AmbientLight,
  PointLight,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface SceneBundle {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  composer: EffectComposer;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

/**
 * Transparent AR scene: the canvas renders the holographic element over a live webcam that
 * shows through behind it. The element provides its own glow via additive materials, so we
 * deliberately avoid a bloom pass — bloom would composite an opaque background and hide the
 * camera passthrough.
 */
export function createScene(canvas: HTMLCanvasElement): SceneBundle {
  const scene = new Scene();
  scene.background = null;

  const camera = new PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 8);

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Soft lighting so the solid nucleus/electron spheres read as physical, not flat.
  scene.add(new AmbientLight(0x88aaff, 0.6));
  const key = new PointLight(0x66ccff, 1.2, 0, 2);
  key.position.set(4, 5, 6);
  scene.add(key);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  renderPass.clearAlpha = 0;
  composer.addPass(renderPass);

  const smaa = new SMAAPass(window.innerWidth, window.innerHeight);
  composer.addPass(smaa);

  composer.addPass(new OutputPass());

  function resize(w: number, h: number) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  }

  function dispose() {
    composer.dispose();
    renderer.dispose();
  }

  return { scene, camera, renderer, composer, resize, dispose };
}
