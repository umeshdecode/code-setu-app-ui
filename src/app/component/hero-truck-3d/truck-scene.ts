/* -------------------------------------------------------------------------
   Procedural truck scene for the landing hero.

   Plain TypeScript — no Angular. This is the ONLY module in the app that
   names three.js, and it is reached exclusively through a dynamic import in
   hero-truck-3d.component.ts. A static import of this file anywhere would
   pull ~500 KB of three into the eager main.js bundle.

   There are no model files in this repo, so every piece of the truck is built
   from primitives. What keeps that from looking like a toy is not the
   geometry — it is bevelled edges, image-based lighting from RoomEnvironment
   (zero asset bytes), ACES tone mapping with colour management on, a long
   32mm-equivalent lens, and very small motion amplitudes.
   ------------------------------------------------------------------------- */

import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ColorManagement,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Material,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  RepeatWrapping,
  Scene,
  sRGBEncoding,
  Texture,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface SceneHandle {
  /** Advance and draw one frame. `dt` in seconds, already clamped by the caller. */
  render(dt: number): void;
  /** CSS pixel size of the canvas. */
  resize(width: number, height: number): void;
  /** Normalised pointer, each axis -1..1. */
  setPointer(x: number, y: number): void;
  /** Jump the entrance animation to its end state (reduced motion). */
  settle(): void;
  dispose(): void;
}

export interface TruckSceneOptions {
  reducedMotion: boolean;
}

/* Brand colours, pre-compensated. ACES desaturates saturated mid-tones, so
   feeding the literal CSS hex renders duller than the swatch beside it.
   These are lifted ~8% in saturation from --lp-accent / --lp-accent-2. */
const BODY_BLUE = 0x4a6ec4;   // ~ --lp-accent  #4663ac
const BRAND_GREEN = 0x2fbf87; // = --lp-accent-2
const RIM_BLUE = 0x7d9ad8;    // = --lp-accent in dark theme

export function createTruckScene(
  canvas: HTMLCanvasElement,
  options: TruckSceneOptions
): SceneHandle {
  // Without this, output is linear and the render looks washed out and plasticky.
  ColorManagement.enabled = true;

  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.outputEncoding = sRGBEncoding;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  // Transparent clear so the hero's CSS radial gradient shows through.
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();

  const FOV = 32;
  const FOV_TAN = Math.tan((FOV * Math.PI) / 180 / 2);
  /* Truck is 4.6 m nose to tail; the extra is breathing room either side. */
  const TRUCK_SPAN = 5.2;
  const TRUCK_CENTRE_Y = 1.1;

  const camera = new PerspectiveCamera(FOV, 1, 0.5, 120);
  /* Unit vector for the camera's eye direction — layout() scales it by a
     distance chosen from the aspect ratio. A 4.6 m truck at 32deg needs ~15 m
     of standoff; at the original 8.6 m it filled the entire frame. */
  const eyeDir = { x: 0.603, y: 0.301, z: 0.742 };
  const cameraHome = { x: 0, y: 0, z: 0 };
  let lookAtY = 1.9;

  /* ---------- disposal bookkeeping ----------
     Materials and geometries are shared across meshes, so collect them in
     Sets rather than traversing and disposing per-mesh (which would double
     free) — see dispose() below. */
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();

  /* `set` is typed structurally, NOT as Set<T> — with Set<T> the generic gets
     inferred from the set argument and collapses every geometry to
     { dispose(): void }. */
  const track = <T extends { dispose(): void }>(
    set: Set<never> | Set<BufferGeometry> | Set<Material> | Set<Texture>,
    item: T
  ): T => {
    (set as Set<unknown>).add(item);
    return item;
  };

  /* ---------- environment lighting ----------
     RoomEnvironment through PMREM does most of the lighting work and costs no
     asset bytes. Both the room and the generator are disposed immediately —
     only the resulting texture is kept. Holding the PMREMGenerator alive (as
     most examples do) pins several render targets for nothing. */
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  textures.add(envMap);
  scene.environment = envMap;
  // Deliberately NOT scene.background — the CSS gradient is the background.

  /* ---------- materials (6 shared instances) ----------
     MeshStandardMaterial throughout, including the glass. MeshPhysicalMaterial
     would drag in the clearcoat/transmission/sheen shader extensions for
     ~20 KB that a windshield does not need. */
  const matBody = track(
    materials,
    new MeshStandardMaterial({
      color: BODY_BLUE,
      metalness: 0.35,
      roughness: 0.28,
      envMapIntensity: 1.15,
    })
  );
  const matPanel = track(
    materials,
    new MeshStandardMaterial({ color: 0xc6d0e0, metalness: 0.15, roughness: 0.5 })
  );
  const matPanelDark = track(
    materials,
    new MeshStandardMaterial({ color: 0xaab6c9, metalness: 0.15, roughness: 0.55 })
  );
  const matAccent = track(
    materials,
    new MeshStandardMaterial({ color: BRAND_GREEN, metalness: 0.2, roughness: 0.35 })
  );
  const matMetal = track(
    materials,
    new MeshStandardMaterial({ color: 0x9fb0c9, metalness: 1, roughness: 0.22 })
  );
  const matRubber = track(
    materials,
    new MeshStandardMaterial({ color: 0x14181f, metalness: 0, roughness: 0.85 })
  );
  const matGlass = track(
    materials,
    new MeshStandardMaterial({
      color: 0x0a1020,
      metalness: 0.85,
      roughness: 0.16,
      envMapIntensity: 0.85,
    })
  );
  const matLamp = track(
    materials,
    new MeshStandardMaterial({
      color: 0xfff4d6,
      emissive: new Color(0xfff4d6),
      emissiveIntensity: 1.6,
      roughness: 0.4,
    })
  );

  /* ---------- geometry helpers ---------- */
  const rounded = (w: number, h: number, d: number, seg: number, r: number) =>
    track(geometries, new RoundedBoxGeometry(w, h, d, seg, r));
  const box = (w: number, h: number, d: number) =>
    track(geometries, new BoxGeometry(w, h, d));

  const add = (
    parent: Group,
    geo: BufferGeometry,
    mat: Material,
    x: number,
    y: number,
    z: number
  ): Mesh => {
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  /* ---------- the truck ----------
     1 unit = 1 metre, ~4.6 units long, three-quarter front-left view. */
  const truck = new Group();
  /* Camera sits in the +X +Z quadrant and the cab is at local -X, so the yaw
     that points the nose at the lens is ~129deg. At the original -0.38 we were
     looking at the back of the trailer. */
  const TRUCK_YAW = 2.25;
  truck.rotation.y = TRUCK_YAW;

  // Chassis rail
  add(truck, box(4.6, 0.1, 1.3), matRubber, 0, 0.52, 0);

  // Cab, roof deflector, bumper, windshield
  add(truck, rounded(1.55, 1.3, 1.72, 4, 0.1), matBody, -1.45, 1.25, 0);
  const deflector = add(truck, rounded(1.2, 0.22, 1.5, 3, 0.08), matBody, -1.35, 1.98, 0);
  deflector.rotation.z = -0.06;
  add(truck, rounded(0.22, 0.34, 1.75, 3, 0.06), matMetal, -2.28, 0.62, 0);
  const windshield = add(truck, rounded(0.1, 0.62, 1.52, 2, 0.04), matGlass, -2.16, 1.62, 0);
  windshield.rotation.z = 0.18;

  // Box body
  add(truck, rounded(2.85, 1.55, 1.78, 4, 0.06), matPanel, 0.95, 1.42, 0);

  /* Ribs. These matter more than they look: without them a smooth box reads
     as a toy brick, because the eye has no scale reference on the panel. */
  const ribGeo = box(0.05, 1.48, 1.8);
  for (let i = -2; i <= 3; i++) {
    add(truck, ribGeo, matPanelDark, 0.95 + i * 0.42, 1.42, 0);
  }

  // Brand band in the accent green
  add(truck, box(2.4, 0.26, 1.802), matAccent, 0.95, 1.05, 0);

  /* Wheels. rotateX is baked into the GEOMETRY so the mesh's local Z stays the
     spin axis — spinning is then a single rotation.z with no gimbal mess.
     Six wheels, not four: the tandem rear axle is what makes this read as a
     commercial truck rather than a delivery van. */
  const wheelGeo = track(geometries, new CylinderGeometry(0.42, 0.42, 0.3, 24));
  wheelGeo.rotateX(Math.PI / 2);
  const hubGeo = track(geometries, new CylinderGeometry(0.17, 0.17, 0.32, 16));
  hubGeo.rotateX(Math.PI / 2);

  const wheels: Mesh[] = [];
  for (const x of [-1.65, 0.45, 1.15]) {
    for (const z of [-0.8, 0.8]) {
      wheels.push(add(truck, wheelGeo, matRubber, x, 0.42, z));
      add(truck, hubGeo, matMetal, x, 0.42, z);
    }
  }

  // Fuel tank and exhaust stack
  const tankGeo = track(geometries, new CylinderGeometry(0.26, 0.26, 0.85, 20));
  tankGeo.rotateZ(Math.PI / 2);
  add(truck, tankGeo, matMetal, -0.75, 0.62, -0.72);
  add(truck, track(geometries, new CylinderGeometry(0.07, 0.07, 1.3, 12)), matMetal, -0.62, 1.4, -0.78);

  // Headlights — the emissive clip to white and sell the tone mapping
  const lampGeo = rounded(0.06, 0.16, 0.3, 2, 0.03);
  add(truck, lampGeo, matLamp, -2.34, 0.86, 0.62);
  add(truck, lampGeo, matLamp, -2.34, 0.86, -0.62);

  /* ---------- ground ----------
     A soft blob shadow, not a shadow map. A 1024 map for a dozen boxes is
     pure waste, and at this scale a soft blob reads better than a hard edge. */
  const shadowTex = track(textures, new CanvasTexture(makeBlobCanvas()));
  const shadowMat = track(
    materials,
    new MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  const shadow = new Mesh(track(geometries, new PlaneGeometry(6, 2)), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;

  /* Road. The alpha falloff painted into the canvas is what stops the plane
     terminating at a visible straight edge — the single most amateur-looking
     thing in hobby three.js scenes. */
  const roadTex = track(textures, new CanvasTexture(makeRoadCanvas()));
  roadTex.wrapS = RepeatWrapping;
  roadTex.repeat.set(13, 1);
  roadTex.encoding = sRGBEncoding;
  const roadMat = track(
    materials,
    new MeshBasicMaterial({
      map: roadTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: DoubleSide,
    })
  );
  const road = new Mesh(track(geometries, new PlaneGeometry(26, 4.6)), roadMat);
  road.rotation.x = -Math.PI / 2;

  /* ---------- lights ----------
     No AmbientLight: the env map already covers fill, and ambient flattens
     the metals. The green point light puts the brand accent into the
     reflections without painting anything green. */
  const key = new DirectionalLight(0xffffff, 0.95);
  key.position.set(-4, 6, 5);
  const rim = new DirectionalLight(RIM_BLUE, 0.7);
  rim.position.set(5, 2, -4);
  const kicker = new PointLight(BRAND_GREEN, 12, 8, 2);
  kicker.position.set(2.2, 0.8, 2.0);

  const root = new Group();
  root.add(truck, shadow, road, key, rim, kicker);
  scene.add(root);

  /* ---------- animation state ---------- */
  let elapsed = 0;
  let entrance = 0; // 0..1
  const ENTRANCE_MS = 900;
  const pointer = { x: 0, y: 0 };
  const camTarget = { x: 0, y: 0 };

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  /* Screen-right unit vector for this eye direction: cross(forward, up).
     Offsetting the truck along THIS (rather than world X) moves it right in
     frame. Offsetting along world X and then re-aiming the camera at it just
     cancels out — the truck stays centred. */
  const screenRight = { x: 0.742, z: -0.603 };

  function layout(width: number, height: number): void {
    const aspect = width / Math.max(height, 1);
    camera.aspect = aspect;

    /* Standoff is COMPUTED from the field of view, not hardcoded. In portrait
       the horizontal extent is the binding constraint — the truck is ~4.6 m
       long, which at a fixed distance is wider than a 375px frame can show, so
       fixed distances made it enormous on phones.

       Horizontal extent at distance d = 2 * d * tan(fov/2) * aspect.
       Solve for the d that makes the truck occupy `widthFraction` of it. */
    let widthFraction: number;
    let rightRatio: number;
    let dropFraction: number; // how far below centre to seat the truck

    if (width >= 1180 && aspect >= 1.4) {
      // Desktop: beside the copy, upper-right.
      widthFraction = 0.45;
      rightRatio = 0.34;
      dropFraction = 0.06;
    } else if (width >= 820) {
      // Small laptop: a touch smaller, still beside the copy.
      widthFraction = 0.42;
      rightRatio = 0.33;
      dropFraction = 0.08;
    } else {
      // Tablet / phone: centred and low, under the stacked copy. Cropping the
      // truck at the sides here is fine and looks better than shrinking it.
      widthFraction = 0.8;
      // Small nudge: the 129deg yaw shifts the truck's projected centre left.
      rightRatio = 0.09;
      dropFraction = 0.30;
    }

    const dist = TRUCK_SPAN / (widthFraction * 2 * FOV_TAN * Math.max(aspect, 0.35));
    const verticalExtent = 2 * dist * FOV_TAN;

    // Aiming above the truck's centre seats it lower in the frame.
    lookAtY = TRUCK_CENTRE_Y + verticalExtent * dropFraction;

    /* Offset scales with distance so the truck holds its position in frame
       rather than drifting centre-ward as the camera pulls back. */
    const right = dist * rightRatio;
    root.position.set(screenRight.x * right, 0, screenRight.z * right);

    cameraHome.x = eyeDir.x * dist;
    cameraHome.y = eyeDir.y * dist;
    cameraHome.z = eyeDir.z * dist;
    camera.position.set(cameraHome.x, cameraHome.y, cameraHome.z);
    camTarget.x = cameraHome.x;
    camTarget.y = cameraHome.y;
    aimCamera();
    camera.updateProjectionMatrix();
  }

  /* Fixed world target — deliberately NOT root.position, see screenRight. */
  function aimCamera(): void {
    camera.lookAt(0, lookAtY, 0);
  }

  function draw(): void {
    renderer.render(scene, camera);
  }

  const handle: SceneHandle = {
    render(dt: number): void {
      elapsed += dt;

      if (entrance < 1) {
        entrance = Math.min(entrance + (dt * 1000) / ENTRANCE_MS, 1);
      }
      const e = easeOutCubic(entrance);
      truck.position.x = -2.2 * (1 - e);

      // Idle motion, deliberately tiny — large amplitudes read as toy.
      truck.position.y = Math.sin(elapsed * 1.6) * 0.012;
      truck.rotation.z = Math.sin(elapsed * 1.1) * 0.004;

      for (const wheel of wheels) {
        wheel.rotation.z -= dt * 6;
      }

      roadTex.offset.x -= dt * 0.35;

      // Frame-rate-independent damping toward the pointer-offset camera.
      camTarget.x = cameraHome.x + pointer.x * 0.9;
      camTarget.y = cameraHome.y + pointer.y * 0.5;
      const k = 1 - Math.pow(0.001, dt);
      camera.position.x += (camTarget.x - camera.position.x) * k;
      camera.position.y += (camTarget.y - camera.position.y) * k;
      aimCamera();

      draw();
    },

    resize(width: number, height: number): void {
      const coarse =
        typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
      renderer.setSize(width, height, false);
      layout(width, height);
    },

    setPointer(x: number, y: number): void {
      if (options.reducedMotion) {
        return;
      }
      pointer.x = x;
      pointer.y = y;
    },

    settle(): void {
      entrance = 1;
      truck.position.x = 0;
      truck.position.y = 0;
      truck.rotation.z = 0;
      draw();
    },

    dispose(): void {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      geometries.clear();
      materials.clear();
      textures.clear();
      scene.clear();
      // Order matters: dispose() needs a live context, forceContextLoss kills it.
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };

  return handle;
}

/* ---------- canvas textures ---------- */

function makeBlobCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) {
    return c;
  }
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.9)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

function makeRoadCanvas(): HTMLCanvasElement {
  const w = 256;
  const h = 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) {
    return c;
  }

  ctx.fillStyle = '#26314a';
  ctx.fillRect(0, 0, w, h);

  // Dashed centre line
  ctx.fillStyle = 'rgba(226,235,250,0.55)';
  ctx.fillRect(0, h / 2 - 2, w * 0.55, 4);

  /* Fade the long edges out so the plane dissolves into the hero band instead
     of ending at a hard line. The X-axis falloff is applied by the material's
     opacity plus the camera framing; this handles the Z edges. */
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.28, 'rgba(0,0,0,0)');
  fade.addColorStop(0.72, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);

  return c;
}
