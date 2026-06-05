import {
  Group,
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
  LineBasicMaterial,
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  ShaderMaterial,
  AdditiveBlending,
  Color,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  Vector3,
  type Material,
} from 'three';

// --- Holographic palette (Iron-Man hologram cyan) ---
const CYAN = 0x5fd0ff;
const ICE = 0xbff4ff;
const LAND = 0x3affc8;

const R = 1.0; // base globe radius (local units)
const LAT_R = 1.55; // radius of the big geodesic atom sphere

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Deterministic pseudo-random so the structure looks the same every run.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Even point distribution on a unit sphere.
function fibonacciSphere(n: number): Vector3[] {
  const pts: Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts.push(new Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  return pts;
}

// Radial-gradient sprite texture for soft additive glows.
function makeGlowTexture(inner: string, outer: string): CanvasTexture {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(cv);
}

// Spiky "urchin" atom — a bright core with a corona of radial rays. Deterministic, bakes once.
function makeUrchinTexture(): CanvasTexture {
  const size = 160;
  const c = size / 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;

  const core = ctx.createRadialGradient(c, c, 0, c, c, c * 0.4);
  core.addColorStop(0, 'rgba(225,247,255,1)');
  core.addColorStop(0.5, 'rgba(150,222,255,0.55)');
  core.addColorStop(1, 'rgba(95,208,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  const spikes = 36;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const jitter = ((i * 73) % 10) / 10;
    const len = c * (0.62 + 0.36 * jitter);
    const x2 = c + Math.cos(a) * len;
    const y2 = c + Math.sin(a) * len;
    const lg = ctx.createLinearGradient(c, c, x2, y2);
    lg.addColorStop(0, 'rgba(220,247,255,0.95)');
    lg.addColorStop(0.6, 'rgba(150,222,255,0.4)');
    lg.addColorStop(1, 'rgba(95,208,255,0)');
    ctx.strokeStyle = lg;
    ctx.lineWidth = i % 2 === 0 ? 1.3 : 0.8;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  return new CanvasTexture(cv);
}

// Fresnel rim-glow material for the energy core — bright at the silhouette, transparent face-on.
function fresnelMaterial(color: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uIntensity: { value: 1.0 },
      uOpacity: { value: 1.0 },
      uPower: { value: 2.2 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uOpacity;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower);
        gl_FragColor = vec4(uColor * (0.25 + f) * uIntensity, (0.18 + f) * uOpacity);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
}

export interface ElementModel {
  root: Group;
  /** Drive the whole morph with one scalar in [0,1] plus an elapsed-time clock (seconds). */
  update(expansion: number, time: number): void;
  dispose(): void;
}

export function createElement(): ElementModel {
  const root = new Group();
  const content = new Group();
  root.add(content);

  const disposables: (BufferGeometry | Material | CanvasTexture)[] = [];
  const track = <T extends BufferGeometry | Material | CanvasTexture>(o: T): T => {
    disposables.push(o);
    return o;
  };

  const glowTex = track(makeGlowTexture('rgba(180,240,255,1)', 'rgba(95,208,255,0.5)'));
  const urchinTex = track(makeUrchinTexture());

  // ---------- GLOBE: ocean shell + land continents + lat/long grid ----------
  const samples = fibonacciSphere(2600);
  const rng = mulberry32(1337);
  const seeds: Vector3[] = [];
  for (let i = 0; i < 9; i++) seeds.push(samples[Math.floor(rng() * samples.length)].clone());
  const landValue = (p: Vector3): number => {
    let v = 0;
    for (const s of seeds) v += Math.exp(-12 * (1 - p.dot(s)));
    return v;
  };

  const oceanPos: number[] = [];
  const landPos: number[] = [];
  for (const p of samples) {
    if (landValue(p) > 0.6) landPos.push(p.x * R, p.y * R, p.z * R);
    else oceanPos.push(p.x * R, p.y * R, p.z * R);
  }

  const oceanGeo = track(new BufferGeometry());
  oceanGeo.setAttribute('position', new Float32BufferAttribute(oceanPos, 3));
  const oceanMat = track(
    new PointsMaterial({
      color: CYAN,
      size: 0.022,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  const oceanPoints = new Points(oceanGeo, oceanMat);

  const landGeo = track(new BufferGeometry());
  landGeo.setAttribute('position', new Float32BufferAttribute(landPos, 3));
  const landMat = track(
    new PointsMaterial({
      color: LAND,
      size: 0.04,
      map: glowTex,
      transparent: true,
      opacity: 1,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  const landPoints = new Points(landGeo, landMat);

  // Lat/long graticule.
  const gratPos: number[] = [];
  const ringsLat = 9;
  const ringsLon = 12;
  const seg = 64;
  for (let i = 1; i < ringsLat; i++) {
    const phi = (i / ringsLat) * Math.PI;
    const y = Math.cos(phi) * R;
    const rr = Math.sin(phi) * R;
    for (let j = 0; j < seg; j++) {
      const a0 = (j / seg) * Math.PI * 2;
      const a1 = ((j + 1) / seg) * Math.PI * 2;
      gratPos.push(Math.cos(a0) * rr, y, Math.sin(a0) * rr, Math.cos(a1) * rr, y, Math.sin(a1) * rr);
    }
  }
  for (let i = 0; i < ringsLon; i++) {
    const theta = (i / ringsLon) * Math.PI * 2;
    for (let j = 0; j < seg; j++) {
      const p0 = (j / seg) * Math.PI;
      const p1 = ((j + 1) / seg) * Math.PI;
      gratPos.push(
        Math.sin(p0) * Math.cos(theta) * R, Math.cos(p0) * R, Math.sin(p0) * Math.sin(theta) * R,
        Math.sin(p1) * Math.cos(theta) * R, Math.cos(p1) * R, Math.sin(p1) * Math.sin(theta) * R,
      );
    }
  }
  const gratGeo = track(new BufferGeometry());
  gratGeo.setAttribute('position', new Float32BufferAttribute(gratPos, 3));
  const gratMat = track(
    new LineBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.22,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const graticule = new LineSegments(gratGeo, gratMat);

  const globe = new Group();
  globe.add(oceanPoints, landPoints, graticule);

  // ---------- ENERGY CORE (the sphere the atoms emerge from) ----------
  const coreGeo = track(new SphereGeometry(R * 0.97, 48, 32));
  const coreMat = track(fresnelMaterial(CYAN));
  const core = new Mesh(coreGeo, coreMat);

  const innerGeo = track(new SphereGeometry(R * 0.5, 24, 16));
  const innerMat = track(
    new MeshStandardMaterial({
      color: ICE,
      emissive: new Color(CYAN),
      emissiveIntensity: 2.4,
      transparent: true,
      opacity: 0.9,
    }),
  );
  const innerGlow = new Mesh(innerGeo, innerMat);

  // ---------- ATOM SPHERE: dense geodesic lattice of real 3D atoms ----------
  // Modelled on the Iron-Man "new element" hologram: a big hollow sphere whose surface is a
  // fine triangulated mesh of atoms — each a real 3D nucleus with spikes + an orbiting electron.
  const lattice = new Group();
  const nodePositions = fibonacciSphere(160).map((d) => d.clone().multiplyScalar(LAT_R));

  // Nucleus — bright spiky orb (additive sprite) at each vertex.
  const nucleusMat = track(
    new SpriteMaterial({
      map: urchinTex,
      color: 0xd8f4ff,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const nuclei = new Group();
  for (const p of nodePositions) {
    const s = new Sprite(nucleusMat);
    s.position.copy(p);
    s.scale.setScalar(0.26);
    s.matrixAutoUpdate = false;
    s.updateMatrix();
    nuclei.add(s);
  }

  // Magnetic-field orbits — each nucleus sits in a dipole field: meridional field-line loops
  // bulge out from the nucleus, while electrons orbit it on the equatorial plane.
  const FIELD_LINES = 6; // dipole loops drawn per atom
  const FSEG = 24; // samples per loop
  const L = 0.2; // field bulge radius
  const ELECTRONS = 2; // electrons orbiting each nucleus
  const eRng = mulberry32(2024);
  const ringPos: number[] = [];
  const orbits: { c: Vector3; u: Vector3; v: Vector3; r: number; speed: number; phase: number }[] = [];
  const tmpA = new Vector3();
  const tmpB = new Vector3();
  for (const p of nodePositions) {
    // Random dipole axis + perpendicular basis (e1, e2) spanning the equatorial plane.
    const axis = new Vector3(eRng() - 0.5, eRng() - 0.5, eRng() - 0.5).normalize();
    const e1 = new Vector3(1, 0, 0);
    if (Math.abs(axis.x) > 0.9) e1.set(0, 1, 0);
    e1.crossVectors(axis, e1).normalize();
    const e2 = new Vector3().crossVectors(axis, e1).normalize();

    // Dipole field lines: rho(theta) = L * sin^2(theta), one loop per azimuth around the axis.
    for (let m = 0; m < FIELD_LINES; m++) {
      const phi = (m / FIELD_LINES) * Math.PI * 2;
      const rad = new Vector3()
        .copy(e1)
        .multiplyScalar(Math.cos(phi))
        .addScaledVector(e2, Math.sin(phi));
      let has = false;
      for (let t = 0; t <= FSEG; t++) {
        const th = (t / FSEG) * Math.PI;
        const sin = Math.sin(th);
        const rho = L * sin * sin;
        tmpB.copy(p).addScaledVector(rad, rho * sin).addScaledVector(axis, rho * Math.cos(th));
        if (has) ringPos.push(tmpA.x, tmpA.y, tmpA.z, tmpB.x, tmpB.y, tmpB.z);
        tmpA.copy(tmpB);
        has = true;
      }
    }

    // Electrons orbit on the equatorial circle (radius ~L) in the e1/e2 plane.
    for (let k = 0; k < ELECTRONS; k++) {
      orbits.push({
        c: p.clone(),
        u: e1.clone(),
        v: e2.clone(),
        r: L * 0.92,
        speed: (1.3 + eRng() * 1.9) * (eRng() < 0.5 ? -1 : 1),
        phase: (k / ELECTRONS) * Math.PI * 2 + eRng() * 0.4,
      });
    }
  }
  const ringGeo = track(new BufferGeometry());
  ringGeo.setAttribute('position', new Float32BufferAttribute(ringPos, 3));
  const ringMat = track(
    new LineBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const rings = new LineSegments(ringGeo, ringMat);

  // Electrons — one bright point per orbital, riding on its ring (positions updated each frame).
  const electronGeo = track(new BufferGeometry());
  electronGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(orbits.length * 3), 3));
  const electronMat = track(
    new PointsMaterial({
      color: 0xffffff,
      size: 0.075,
      map: glowTex,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  const electronPoints = new Points(electronGeo, electronMat);
  electronPoints.frustumCulled = false;

  lattice.add(rings, nuclei, electronPoints);

  // ---------- SPARKLE FIELD: fine drifting dust swirling around the element ----------
  const pCount = 1600;
  const pPos: number[] = [];
  const pRng = mulberry32(7);
  for (let i = 0; i < pCount; i++) {
    const dir = new Vector3(pRng() - 0.5, pRng() - 0.5, pRng() - 0.5).normalize();
    dir.multiplyScalar(0.3 + pRng() * 2.2);
    pPos.push(dir.x, dir.y, dir.z);
  }
  const partGeo = track(new BufferGeometry());
  partGeo.setAttribute('position', new Float32BufferAttribute(pPos, 3));
  const partMat = track(
    new PointsMaterial({
      color: 0xe6f8ff,
      size: 0.016,
      map: glowTex,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  const particles = new Points(partGeo, partMat);

  // ---------- HALO ----------
  const halo = new Sprite(
    track(
      new SpriteMaterial({
        map: glowTex,
        color: CYAN,
        transparent: true,
        opacity: 0.3,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  halo.scale.setScalar(5);

  content.add(halo, globe, core, innerGlow, particles, lattice);

  function update(e: number, time: number): void {
    const pulse = 1 + 0.04 * Math.sin(time * 2.2);

    // Globe layers.
    const landFade = 1 - smoothstep(0.05, 0.3, e);
    oceanMat.opacity = 0.5 * (1 - smoothstep(0.58, 0.85, e));
    landMat.opacity = landFade;
    gratMat.opacity = 0.22 * (1 - smoothstep(0.5, 0.78, e));
    globe.rotation.y = time * 0.18;
    landPoints.visible = landMat.opacity > 0.01;

    // Energy core: rises as land fades (mid stage), then hollows out as the atom sphere forms.
    const coreUp = smoothstep(0.18, 0.5, e);
    const coreFade = 1 - smoothstep(0.55, 0.82, e);
    const coreScale = (1.0 + 0.06 * coreUp) * pulse;
    core.scale.setScalar(coreScale);
    innerGlow.scale.setScalar(coreScale);
    coreMat.uniforms.uOpacity.value = (0.2 + 0.75 * coreUp) * coreFade;
    coreMat.uniforms.uIntensity.value = 1 + 0.5 * coreUp;
    innerMat.opacity = (0.25 + 0.5 * coreUp) * coreFade;

    // Atom sphere: spiky nuclei encircled by orbital rings, electrons riding the rings.
    const latAmt = smoothstep(0.5, 0.92, e);
    lattice.visible = latAmt > 0.01;
    lattice.scale.setScalar(lerp(0.6, 1.0, latAmt));
    lattice.rotation.y = time * 0.16;
    lattice.rotation.x = Math.sin(time * 0.15) * 0.12;
    nucleusMat.opacity = latAmt * (0.82 + 0.18 * Math.sin(time * 2.5));
    nucleusMat.rotation = time * 0.1;
    ringMat.opacity = 0.24 * latAmt;
    electronMat.opacity = latAmt;
    if (lattice.visible) {
      const arr = electronGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < orbits.length; i++) {
        const o = orbits[i];
        const t = time * o.speed + o.phase;
        const c = Math.cos(t) * o.r;
        const s = Math.sin(t) * o.r;
        arr[i * 3] = o.c.x + o.u.x * c + o.v.x * s;
        arr[i * 3 + 1] = o.c.y + o.u.y * c + o.v.y * s;
        arr[i * 3 + 2] = o.c.z + o.u.z * c + o.v.z * s;
      }
      electronGeo.attributes.position.needsUpdate = true;
    }

    // Sparkle: fine dust that twinkles and swirls — present even on the small orb.
    const sparkle = smoothstep(0.12, 0.55, e);
    partMat.opacity = (0.4 + 0.25 * Math.sin(time * 3.5)) * sparkle;
    particles.rotation.y = -time * 0.14;
    particles.rotation.x = time * 0.06;

    // Halo — softer so it backlights the sphere instead of washing the huge frame out.
    halo.scale.setScalar(lerp(2.4, 3.2, e) * pulse);
    (halo.material as SpriteMaterial).opacity = 0.12 + 0.12 * e;

    // SIZE is the headline effect: closed hands → a tiny eye-sized orb, spreading hands grows
    // it as large as it can go — at full spread the sphere nearly fills the space to the camera.
    content.scale.setScalar(lerp(0.12, 4.2, e));
  }

  function dispose(): void {
    for (const d of disposables) d.dispose();
  }

  update(0, 0);
  return { root, update, dispose };
}
