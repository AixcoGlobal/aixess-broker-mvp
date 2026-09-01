import {
  Component,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Application, Entity } from "@playcanvas/react";
import { Camera, GSplat, Render, Script } from "@playcanvas/react/components";
import { useApp, useAppEvent, useSplat, useTexture } from "@playcanvas/react/hooks";
import { CameraControls } from "playcanvas/scripts/esm/camera-controls.mjs";
import {
  DEVICETYPE_WEBGL2,
  DEVICETYPE_WEBGPU,
  ADDRESS_CLAMP_TO_EDGE,
  ADDRESS_REPEAT,
  CULLFACE_FRONT,
  FILLMODE_NONE,
  FILTER_LINEAR,
  GSPLATDATA_LARGE,
  Mat4,
  RESOLUTION_FIXED,
  StandardMaterial,
  TYPE_FLOAT32,
  Vec2,
  Vec3,
} from "playcanvas";
import { getFloorSummary } from "../data/reveranceApi";
import { isPointWithinRect } from "../utils/pageScroll";
import {
  getCameraPathPose,
  getFloorTooltipPosition,
  getKeyboardFloorTarget,
} from "./reveranceSplatMath";
import {
  REVERANCE_FLOOR_HIGHLIGHT_CANDIDATE_EPSILON,
  REVERANCE_FLOOR_HIGHLIGHT_HEIGHT,
  REVERANCE_FLOOR_HIGHLIGHT_MIN_FEATHER,
  REVERANCE_FLOOR_SIZE,
  REVERANCE_FLOOR_VOLUMES,
  REVERANCE_SPLAT_ROTATION,
  getFloorVisualYOffset,
  getHighlightWorldToFloorTransform,
  getWorldToFloorTransform,
  pickFloorFromScreen,
} from "./reveranceFloorHighlight";

const SPLAT_URL = "/assets/reverance-3d/reverance-official-97.sog?v=acb1246f";
const HORIZON_URL = "/assets/reverance-3d/reverance-official-horizon.webp";
const CAMERA_FOV = 41.09622780396063;
const CAMERA_MIN_FOV = 31;
const CAMERA_TARGET = [-0.10454206208274158, 0.0008068618049380962, 0.10121364916726469];
const CAMERA_START = [2.504352717259611, 0.014715904099223222, 2.7438049729703717];
const CAMERA_END = [2.571008603437904, -0.010401810476404838, -2.4755136248454392];
const CAMERA_UP = [-0.000569128058664063, 0.9999881472011365, -0.004835447289666561];
const CAMERA_FOCUS = new Vec3(...CAMERA_TARGET);
const CAMERA_PITCH_RANGE = new Vec2(-0.08, 0.08);
const CAMERA_YAW_RANGE = new Vec2(-360, 360);
const CAMERA_ZOOM_RANGE = new Vec2(3.7123, 3.7165);
const DISTANT_ENVIRONMENT_RADIUS = 20;
const HOVER_PICK_INTERVAL_SCROLL_MS = 64;
const HOVER_PICK_INTERVAL_SETTLED_MS = 32;
const RENDER_SCALE_MAX = 2;
const RENDER_SCALE_MOBILE_MAX = 1.5;
const RENDER_MAX_DIMENSION = 1440;
const MOBILE_RENDER_WIDTH = 480;
const CANVAS_STYLE = { width: "100%", height: "100%" };
const SPLAT_DEVICE_TYPES = [DEVICETYPE_WEBGL2, DEVICETYPE_WEBGPU];
const GRAPHICS_OPTIONS = {
  alpha: false,
  antialias: false,
  depth: true,
  stencil: false,
  powerPreference: "high-performance",
  preserveDrawingBuffer: false,
  desynchronized: false,
};
const FLOOR_HIGHLIGHT_HALF_SIZE = new Float32Array(
  [
    REVERANCE_FLOOR_SIZE[0] * 0.5,
    REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5,
    REVERANCE_FLOOR_SIZE[2] * 0.5,
  ],
);
const FLOOR_PICK_VOLUMES = REVERANCE_FLOOR_VOLUMES.map((volume) => ({
  number: volume.number,
  worldToLocal: getWorldToFloorTransform(volume),
}));
const FLOOR_HIGHLIGHT_GLSL = `
uniform mat4 uFloorWorldToLocal;
uniform vec3 uFloorHalfSize;
uniform float uFloorHighlightEnabled;
uniform float uDistantEnvironmentRadius;
uniform vec4 uFloorWorldToClipW;

void modifySplatCenter(inout vec3 center) {}
void modifySplatRotationScale(vec3 originalCenter, vec3 modifiedCenter, inout vec4 rotation, inout vec3 scale) {}
void modifySplatColor(vec3 center, inout vec4 color) {
  setFloorSpan(vec2(0.0));
  if (length(center) >= uDistantEnvironmentRadius) {
    color.a = 0.0;
    return;
  }
  vec3 localCenter = (uFloorWorldToLocal * vec4(center, 1.0)).xyz;
  bool insideFloor = all(lessThanEqual(abs(localCenter), uFloorHalfSize));
  float clipW = dot(uFloorWorldToClipW, vec4(center, 1.0));
  setFloorSpan(vec2(
    localCenter.y,
    uFloorHighlightEnabled > 0.5 && insideFloor ? clipW : 0.0
  ));
}
`;
const FLOOR_HIGHLIGHT_WGSL = `
uniform uFloorWorldToLocal: mat4x4f;
uniform uFloorHalfSize: vec3f;
uniform uFloorHighlightEnabled: f32;
uniform uDistantEnvironmentRadius: f32;
uniform uFloorWorldToClipW: vec4f;

fn modifySplatCenter(center: ptr<function, vec3f>) {}
fn modifySplatRotationScale(originalCenter: vec3f, modifiedCenter: vec3f, rotation: ptr<function, vec4f>, scale: ptr<function, vec3f>) {}
fn modifySplatColor(center: vec3f, color: ptr<function, vec4f>) {
  setFloorSpan(vec2f(0.0));
  if (length(center) >= uniform.uDistantEnvironmentRadius) {
    *color = vec4f((*color).rgb, 0.0);
    return;
  }
  let localCenter = (uniform.uFloorWorldToLocal * vec4f(center, 1.0)).xyz;
  let insideFloor = all(abs(localCenter) <= uniform.uFloorHalfSize);
  let clipW = dot(uniform.uFloorWorldToClipW, vec4f(center, 1.0));
  setFloorSpan(vec2f(
    localCenter.y,
    select(0.0, clipW, uniform.uFloorHighlightEnabled > 0.5 && insideFloor)
  ));
}
`;
const FLOOR_HIGHLIGHT_FRAGMENT_GLSL = `
uniform vec2 uFloorPixelToLocalY;
uniform vec3 uFloorHalfSize;
uniform float uFloorVisualYOffset;

void modifySplatColor(vec2 gaussianUV, inout vec4 color) {
  vec2 dx = dFdx(gaussianUV);
  vec2 dy = dFdy(gaussianUV);
  float determinant = dx.x * dy.y - dy.x * dx.y;
  float safeDeterminant = abs(determinant) > 1e-8 ? determinant : 1.0;
  vec2 pixelOffset = vec2(
    gaussianUV.x * dy.y - dy.x * gaussianUV.y,
    dx.x * gaussianUV.y - gaussianUV.x * dx.y
  ) / safeDeterminant;
  vec2 floorSpan = getFloorSpan();
  float fragmentY = floorSpan.x
    + floorSpan.y * dot(pixelOffset, uFloorPixelToLocalY);
  float antialiasWidth = max(fwidth(fragmentY), ${REVERANCE_FLOOR_HIGHLIGHT_MIN_FEATHER});
  float slab = smoothstep(0.0, antialiasWidth, uFloorHalfSize.y - abs(fragmentY));
  float mask = step(${REVERANCE_FLOOR_HIGHLIGHT_CANDIDATE_EPSILON}, abs(floorSpan.y)) * slab;
  color.rgb = mix(color.rgb, vec3(1.0, 0.36, 0.04), 0.58 * mask);
}
`;
const FLOOR_HIGHLIGHT_FRAGMENT_WGSL = `
uniform uFloorPixelToLocalY: vec2f;
uniform uFloorHalfSize: vec3f;
uniform uFloorVisualYOffset: f32;

fn modifySplatColor(gaussianUV: vec2f, color: ptr<function, vec4f>) {
  let dx = dpdx(gaussianUV);
  let dy = dpdy(gaussianUV);
  let determinant = dx.x * dy.y - dy.x * dx.y;
  let safeDeterminant = select(1.0, determinant, abs(determinant) > 1e-8);
  let pixelOffset = vec2f(
    gaussianUV.x * dy.y - dy.x * gaussianUV.y,
    dx.x * gaussianUV.y - gaussianUV.x * dx.y
  ) / safeDeterminant;
  let floorSpan = getFloorSpan();
  let pixelToLocalY = vec2f(
    uniform.uFloorPixelToLocalY.x,
    -uniform.uFloorPixelToLocalY.y
  );
  let fragmentY = floorSpan.x
    + floorSpan.y * dot(pixelOffset, pixelToLocalY);
  let antialiasWidth = max(fwidth(fragmentY), ${REVERANCE_FLOOR_HIGHLIGHT_MIN_FEATHER});
  let slab = smoothstep(0.0, antialiasWidth, uniform.uFloorHalfSize.y - abs(fragmentY));
  let mask = step(${REVERANCE_FLOOR_HIGHLIGHT_CANDIDATE_EPSILON}, abs(floorSpan.y)) * slab;
  let rgb = mix((*color).rgb, vec3f(1.0, 0.36, 0.04), 0.58 * mask);
  *color = vec4f(rgb, (*color).a);
}
`;

function floorName(number) {
  return `Floor ${String(number).padStart(2, "0")}`;
}

function getAdaptiveRenderScale(width, height) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const longest = Math.max(width, height);
  if (longest <= 0) return 1;
  const capScale = RENDER_MAX_DIMENSION / longest;
  const mobileCap = width <= MOBILE_RENDER_WIDTH ? RENDER_SCALE_MOBILE_MAX : RENDER_SCALE_MAX;
  return Math.min(Math.max(dpr, 1), mobileCap, capScale);
}

function getHoverPickInterval(settled) {
  return settled ? HOVER_PICK_INTERVAL_SETTLED_MS : HOVER_PICK_INTERVAL_SCROLL_MS;
}

function installFloorHighlightShaders(app) {
  const gsplat = app.scene.gsplat;
  const material = gsplat.material;
  const varyings = gsplat.varyings;
  const glslChunks = material.getShaderChunks("glsl");
  const wgslChunks = material.getShaderChunks("wgsl");
  const addedFloorSpan = !varyings.streams.some(({ name }) => name === "floorSpan");

  if (addedFloorSpan) {
    varyings.add([{ name: "floorSpan", type: TYPE_FLOAT32, components: 2 }]);
    varyings.apply(material);
  }
  glslChunks.set("gsplatModifyVS", FLOOR_HIGHLIGHT_GLSL);
  wgslChunks.set("gsplatModifyVS", FLOOR_HIGHLIGHT_WGSL);
  glslChunks.set("gsplatModifyPS", FLOOR_HIGHLIGHT_FRAGMENT_GLSL);
  wgslChunks.set("gsplatModifyPS", FLOOR_HIGHLIGHT_FRAGMENT_WGSL);
  material.update();
  gsplat.dirty = true;
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return reducedMotion;
}

function RenderQuality() {
  const app = useApp();

  useLayoutEffect(() => {
    const canvas = app.graphicsDevice.canvas;
    const gsplat = app.scene.gsplat;
    const previous = {
      antiAlias: gsplat.antiAlias,
      dataFormat: gsplat.dataFormat,
      minContribution: gsplat.minContribution,
      minPixelSize: gsplat.minPixelSize,
      radialSorting: gsplat.radialSorting,
    };
    let resizeFrame = 0;

    const resize = () => {
      resizeFrame = 0;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const scale = getAdaptiveRenderScale(bounds.width, bounds.height);
      app.setCanvasResolution(
        RESOLUTION_FIXED,
        Math.round(bounds.width * scale),
        Math.round(bounds.height * scale),
      );
    };
    const scheduleResize = () => {
      if (!resizeFrame) resizeFrame = window.requestAnimationFrame(resize);
    };
    const resizeObserver = new ResizeObserver(scheduleResize);

    gsplat.radialSorting = true;
    gsplat.antiAlias = true;
    gsplat.minPixelSize = 0.75;
    gsplat.dataFormat = GSPLATDATA_LARGE;
    if (app.graphicsDevice.isWebGPU) {
      gsplat.minContribution = 2;
    }
    resizeObserver.observe(canvas);
    resize();

    return () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      gsplat.radialSorting = previous.radialSorting;
      gsplat.antiAlias = previous.antiAlias;
      gsplat.minContribution = previous.minContribution;
      gsplat.minPixelSize = previous.minPixelSize;
      gsplat.dataFormat = previous.dataFormat;
    };
  }, [app]);

  return null;
}

function VisibilityGovernor() {
  const app = useApp();

  useLayoutEffect(() => {
    const canvas = app.graphicsDevice.canvas;
    if (!canvas || !("IntersectionObserver" in window)) return undefined;

    app.autoRender = true;

    const observer = new IntersectionObserver(([entry]) => {
      app.autoRender = entry.isIntersecting;
      if (entry.isIntersecting) app.renderNextFrame = true;
    }, { threshold: 0 });

    observer.observe(canvas);
    return () => {
      observer.disconnect();
      app.autoRender = true;
    };
  }, [app]);

  return null;
}

function CameraRig({ controlsActive, fov, interactive, manualCameraRef, onCameraReady, progressRef, reducedMotion, settled }) {
  const entityRef = useRef(null);
  const controlsRef = useRef(null);
  const lastScrollPoseRef = useRef({ progress: Number.NaN, reducedMotion: null });
  const initialPose = useMemo(
    () => getCameraPathPose(progressRef.current, CAMERA_START, CAMERA_END, CAMERA_TARGET, reducedMotion),
    [progressRef, reducedMotion],
  );

  const placeCamera = useCallback((position, syncControls = false) => {
    const entity = entityRef.current;
    if (!entity) return;
    entity.setPosition(...position);
    entity.lookAt(...CAMERA_TARGET, ...CAMERA_UP);
    if (syncControls && controlsRef.current?.reset) {
      // CameraControls keeps its own pose even while disabled. Keep that pose on
      // the exact scroll camera so the first manual drag cannot snap backward.
      controlsRef.current._pose?.look(new Vec3(...position), CAMERA_FOCUS);
      controlsRef.current.reset(CAMERA_FOCUS, new Vec3(...position));
    }
  }, []);

  useEffect(() => {
    if (!settled || manualCameraRef.current) return;
    placeCamera(CAMERA_END, true);
  }, [manualCameraRef, placeCamera, settled]);

  useEffect(() => {
    if (!entityRef.current) return undefined;
    onCameraReady(entityRef.current);
    return () => onCameraReady(null);
  }, [onCameraReady]);

  useAppEvent("update", () => {
    if (settled || manualCameraRef.current) return;
    const progress = progressRef.current;
    const lastScrollPose = lastScrollPoseRef.current;
    if (progress === lastScrollPose.progress && reducedMotion === lastScrollPose.reducedMotion) return;
    lastScrollPose.progress = progress;
    lastScrollPose.reducedMotion = reducedMotion;
    const target = getCameraPathPose(
      progress,
      CAMERA_START,
      CAMERA_END,
      CAMERA_TARGET,
      reducedMotion,
    ).position;
    // A trailing camera tween outlives the scroll event and makes WebGL's async
    // splat sorter display stale intermediate orders. Track the scroll pose exactly.
    placeCamera(target, true);
  });

  return (
    <Entity ref={entityRef} name="Official Reverance orbit camera" position={initialPose.position}>
      <Camera clearColor="#9aabb7" fov={fov} nearClip={1} farClip={500} />
      {interactive && (
        <Script
          ref={controlsRef}
          script={CameraControls}
          enabled={controlsActive}
          enableOrbit
          enableFly={false}
          enablePan={false}
          focusPoint={CAMERA_FOCUS}
          pitchRange={CAMERA_PITCH_RANGE}
          yawRange={CAMERA_YAW_RANGE}
          zoomRange={CAMERA_ZOOM_RANGE}
          rotateSpeed={0.12}
          zoomSpeed={0}
          moveDamping={0.96}
          rotateDamping={0.9}
          zoomDamping={0.965}
          focusDamping={0.93}
        />
      )}
    </Entity>
  );
}

function HorizonEnvironment() {
  const { asset } = useTexture(HORIZON_URL, { data: { mipmaps: true } });
  const material = useMemo(() => {
    if (!asset?.resource) return null;
    const texture = asset.resource;
    texture.addressU = ADDRESS_REPEAT;
    texture.addressV = ADDRESS_CLAMP_TO_EDGE;
    texture.minFilter = FILTER_LINEAR;
    texture.magFilter = FILTER_LINEAR;

    const nextMaterial = new StandardMaterial();
    nextMaterial.diffuseMap = texture;
    nextMaterial.emissiveMap = texture;
    nextMaterial.emissive.set(1, 1, 1);
    nextMaterial.useLighting = false;
    nextMaterial.cull = CULLFACE_FRONT;
    nextMaterial.depthWrite = false;
    nextMaterial.update();
    return nextMaterial;
  }, [asset]);

  useEffect(() => () => material?.destroy(), [material]);
  if (!material) return null;

  return (
    <Entity
      name="Official Otium distant mountain environment"
      position={CAMERA_TARGET}
      rotation={[0, 180, 0]}
      scale={[70, 70, 70]}
    >
      <Render type="sphere" material={material} castShadows={false} receiveShadows={false} />
    </Entity>
  );
}

function SplatAsset({ onStateChange }) {
  const { asset, error, loading, subscribe } = useSplat(SPLAT_URL);

  useEffect(() => subscribe(({ progress }) => {
    onStateChange({
      status: "loading",
      progress: Math.min(1, Math.max(0, progress || 0)),
      error: null,
    });
  }), [onStateChange, subscribe]);

  useEffect(() => {
    if (error) {
      onStateChange({ status: "error", progress: 0, error });
    } else if (asset && !loading) {
      onStateChange({ status: "ready", progress: 1, error: null });
    }
  }, [asset, error, loading, onStateChange]);

  if (!asset) return null;
  return <GSplat asset={asset} castShadows={false} unified />;
}


export function getFloorAtWorldPoint(worldPoint) {
  const localPoint = new Vec3();
  for (const volume of FLOOR_PICK_VOLUMES) {
    volume.worldToLocal.transformPoint(worldPoint, localPoint);
    if (
      Math.abs(localPoint.x) < FLOOR_HIGHLIGHT_HALF_SIZE[0]
      && Math.abs(localPoint.y) < FLOOR_HIGHLIGHT_HALF_SIZE[1]
      && Math.abs(localPoint.z) < FLOOR_HIGHLIGHT_HALF_SIZE[2]
    ) {
      return volume.number;
    }
  }
  return null;
}

function FloorPicker({ cameraEntityRef, pickerRef }) {
  const app = useApp();

  useLayoutEffect(() => {
    const canvas = app.graphicsDevice.canvas;
    if (!canvas) return undefined;

    pickerRef.current = {
      pick: (cssX, cssY) => {
        const cameraEntity = cameraEntityRef.current;
        const rect = canvas.getBoundingClientRect();
        if (!cameraEntity || rect.width <= 0 || rect.height <= 0) return null;
        return pickFloorFromScreen(cameraEntity, cssX, cssY, rect.width, rect.height);
      },
    };

    return () => {
      if (pickerRef.current?.pick) pickerRef.current = null;
    };
  }, [app, cameraEntityRef, pickerRef]);

  return null;
}

function FloorHighlight({ floorNumber, splatReady }) {
  const app = useApp();
  const viewProjection = useRef(new Mat4());
  const inverseViewProjection = useRef(new Mat4());
  const floorFromClip = useRef(new Mat4());
  const floorWorldToLocal = useRef(new Mat4());
  const worldToClipW = useRef(new Float32Array(4));
  const pixelToLocalY = useRef(new Float32Array(2));
  const lastUniformSignature = useRef("");
  const patchedMaterials = useRef(new WeakSet());

  const patchMaterial = useCallback((material) => {
    if (!material || patchedMaterials.current.has(material)) return;
    const glslChunks = material.getShaderChunks("glsl");
    const wgslChunks = material.getShaderChunks("wgsl");
    glslChunks.set("gsplatModifyVS", FLOOR_HIGHLIGHT_GLSL);
    wgslChunks.set("gsplatModifyVS", FLOOR_HIGHLIGHT_WGSL);
    glslChunks.set("gsplatModifyPS", FLOOR_HIGHLIGHT_FRAGMENT_GLSL);
    wgslChunks.set("gsplatModifyPS", FLOOR_HIGHLIGHT_FRAGMENT_WGSL);
    material.update();
    patchedMaterials.current.add(material);
  }, []);

  useEffect(() => {
    installFloorHighlightShaders(app);
    patchMaterial(app.scene.gsplat.material);

    const onMaterialCreated = (material) => {
      patchMaterial(material);
      app.scene.gsplat.dirty = true;
    };
    app.systems.gsplat.on("material:created", onMaterialCreated);

    return () => {
      app.systems.gsplat.off("material:created", onMaterialCreated);
      const material = app.scene.gsplat.material;
      const varyings = app.scene.gsplat.varyings;
      const glslChunks = material.getShaderChunks("glsl");
      const wgslChunks = material.getShaderChunks("wgsl");
      glslChunks.delete("gsplatModifyVS");
      wgslChunks.delete("gsplatModifyVS");
      glslChunks.delete("gsplatModifyPS");
      wgslChunks.delete("gsplatModifyPS");
      if (varyings.streams.some(({ name }) => name === "floorSpan")) {
        varyings.remove(["floorSpan"]);
        varyings.apply(material);
      }
      material.update();
    };
  }, [app, patchMaterial]);

  useEffect(() => {
    if (!splatReady) return;
    installFloorHighlightShaders(app);
    patchMaterial(app.scene.gsplat.material);
    app.scene.gsplat.dirty = true;
  }, [app, patchMaterial, splatReady]);

  useEffect(() => {
    lastUniformSignature.current = "";
    const material = app.scene.gsplat.material;
    const volume = REVERANCE_FLOOR_VOLUMES.find((candidate) => candidate.number === floorNumber);
    const transform = new Mat4();
    if (volume) {
      transform.copy(getHighlightWorldToFloorTransform(volume));
    }
    floorWorldToLocal.current.copy(transform);

    material.setParameter("uFloorWorldToLocal", transform.data);
    material.setParameter("uFloorHalfSize", FLOOR_HIGHLIGHT_HALF_SIZE);
    material.setParameter("uFloorHighlightEnabled", volume ? 1 : 0);
    material.setParameter("uFloorWorldToClipW", worldToClipW.current);
    material.setParameter("uFloorPixelToLocalY", pixelToLocalY.current);
    material.setParameter("uFloorVisualYOffset", volume ? getFloorVisualYOffset(volume.number) : 0);
    material.setParameter("uDistantEnvironmentRadius", DISTANT_ENVIRONMENT_RADIUS);
    material.update();
    app.scene.gsplat.dirty = true;
    app.renderNextFrame = true;
  }, [app, floorNumber]);

  useAppEvent("update", () => {
    if (floorNumber === null || floorNumber === undefined) return;
    const camera = app.root.findByName("Official Reverance orbit camera")?.camera;
    if (!camera) return;

    const projection = camera.projectionMatrix;
    const view = camera.viewMatrix;
    const vp = viewProjection.current.mul2(projection, view);
    const invVp = inverseViewProjection.current.copy(vp).invert();
    const fromClip = floorFromClip.current.mul2(floorWorldToLocal.current, invVp);
    const vpData = vp.data;
    const fromClipData = fromClip.data;
    const width = Math.max(1, app.graphicsDevice.width);
    const height = Math.max(1, app.graphicsDevice.height);

    worldToClipW.current[0] = vpData[3];
    worldToClipW.current[1] = vpData[7];
    worldToClipW.current[2] = vpData[11];
    worldToClipW.current[3] = vpData[15];
    pixelToLocalY.current[0] = (2 * fromClipData[1]) / width;
    pixelToLocalY.current[1] = (2 * fromClipData[5]) / height;

    const signature = `${vpData[3].toFixed(6)}|${vpData[7].toFixed(6)}|${vpData[11].toFixed(6)}|${vpData[15].toFixed(6)}|${pixelToLocalY.current[0].toFixed(8)}|${pixelToLocalY.current[1].toFixed(8)}`;
    if (signature === lastUniformSignature.current) return;
    lastUniformSignature.current = signature;

    const material = app.scene.gsplat.material;
    material.setParameter("uFloorWorldToClipW", worldToClipW.current);
    material.setParameter("uFloorPixelToLocalY", pixelToLocalY.current);
    app.renderNextFrame = true;
  });

  return null;
}

function SplatScene({
  cameraEntityRef,
  controlsActive,
  hoveredFloor,
  highlightedFloor,
  fov,
  interactive,
  manualCameraRef,
  onCameraReady,
  onStateChange,
  pickerRef,
  progressRef,
  reducedMotion,
  settled,
  splatReady,
}) {
  return (
    <>
      <CameraRig
        controlsActive={controlsActive}
        fov={fov}
        interactive={interactive}
        manualCameraRef={manualCameraRef}
        onCameraReady={onCameraReady}
        progressRef={progressRef}
        reducedMotion={reducedMotion}
        settled={settled}
      />
      <HorizonEnvironment />
      <Entity name="Official Project Reverance reconstruction" rotation={REVERANCE_SPLAT_ROTATION}>
        <SplatAsset onStateChange={onStateChange} />
      </Entity>
      <FloorPicker cameraEntityRef={cameraEntityRef} pickerRef={pickerRef} />
      <FloorHighlight
        floorNumber={interactive ? hoveredFloor ?? highlightedFloor : null}
        splatReady={splatReady}
      />
      <VisibilityGovernor />
    </>
  );
}

class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function StaticFallback({ snapshot, highlightedFloor, onSelectFloor }) {
  const floorsByNumber = new Map(snapshot.floors.map((floor) => [String(floor.number), floor]));
  return (
    <div className="model-static-fallback">
      <img src={snapshot.buildingImage} alt="Project Reverance A Block front elevation" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Select a floor">
        {snapshot.buildingShapes.map((shape) => {
          const floor = floorsByNumber.get(String(shape.target));
          const summary = getFloorSummary(floor);
          return (
            <polygon
              className={Number(shape.target) === highlightedFloor ? "is-filter-match" : ""}
              key={shape.id}
              tabIndex="0"
              role="button"
              aria-label={`${floorName(shape.target)}, ${summary.available} available residences`}
              points={(shape.points || []).map((point) => `${point.x},${point.y}`).join(" ")}
              onClick={() => onSelectFloor(Number(shape.target))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelectFloor(Number(shape.target));
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function Reverance3D({ snapshot, onSelectFloor, highlightedFloor = null, settled, interactive = settled, progressRef }) {
  const [hoveredFloor, setHoveredFloor] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [loadState, setLoadState] = useState({ status: "loading", progress: 0, error: null });
  const [cameraFov, setCameraFov] = useState(CAMERA_FOV);
  const [manualControlsActive, setManualControlsActive] = useState(false);
  const cameraEntityRef = useRef(null);
  const manualCameraRef = useRef(false);
  const pickerRef = useRef(null);
  const modelRef = useRef(null);
  const pointerStartRef = useRef(null);
  const touchPointersRef = useRef(new Map());
  const pinchDistanceRef = useRef(null);
  const hoverRequestRef = useRef(0);
  const hoverFrameRef = useRef(0);
  const lastHoverPickTimeRef = useRef(0);
  const latestHoverRef = useRef(null);
  const draggedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const railRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const canRenderSplat = typeof window !== "undefined"
    && ("WebGL2RenderingContext" in window || "gpu" in window.navigator);
  const orderedFloors = useMemo(
    () => [...snapshot.floors].sort((a, b) => b.number - a.number),
    [snapshot.floors],
  );
  const hoveredFloorData = useMemo(
    () => snapshot.floors.find((floor) => floor.number === hoveredFloor) || null,
    [hoveredFloor, snapshot.floors],
  );
  const hoveredFloorSummary = hoveredFloorData ? getFloorSummary(hoveredFloorData) : null;
  const effectiveHighlightedFloor = hoveredFloor ?? highlightedFloor;

  const reportState = useCallback((nextState) => setLoadState(nextState), []);
  const handleCameraReady = useCallback((entity) => {
    cameraEntityRef.current = entity;
  }, []);
  const handleRenderError = useCallback((error) => {
    setLoadState({
      status: "error",
      progress: 0,
      error: error?.message || "The 3D renderer could not start.",
    });
  }, []);

  const handleFloorKeyDown = useCallback((event, currentFloor) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectFloor(currentFloor);
      return;
    }
    const target = getKeyboardFloorTarget(snapshot.floors, currentFloor, event.key);
    if (target === currentFloor) return;
    event.preventDefault();
    railRef.current?.querySelector(`[data-floor="${target}"]`)?.focus();
  }, [onSelectFloor, snapshot.floors]);

  const pickFloorAtPoint = useCallback((canvas, cssX, cssY) => {
    if (!interactive || loadState.status !== "ready" || !canvas || !pickerRef.current?.pick) return null;
    const rect = canvas.getBoundingClientRect();
    if (cssX < 0 || cssY < 0 || cssX > rect.width || cssY > rect.height) return null;
    return pickerRef.current.pick(cssX, cssY);
  }, [interactive, loadState.status]);

  const invalidateHoverPick = useCallback(() => {
    hoverRequestRef.current += 1;
    latestHoverRef.current = null;
    if (hoverFrameRef.current) {
      window.cancelAnimationFrame(hoverFrameRef.current);
      hoverFrameRef.current = 0;
    }
  }, []);

  const scheduleHoverPick = useCallback((payload) => {
    latestHoverRef.current = payload;
    if (hoverFrameRef.current) return;
    const run = () => {
      hoverFrameRef.current = 0;
      const next = latestHoverRef.current;
      latestHoverRef.current = null;
      if (!next) return;
      const now = window.performance?.now?.() ?? Date.now();
      const elapsed = now - lastHoverPickTimeRef.current;
      const pickInterval = getHoverPickInterval(settled);
      if (elapsed < pickInterval) {
        latestHoverRef.current = next;
        hoverFrameRef.current = window.requestAnimationFrame(run);
        return;
      }
      lastHoverPickTimeRef.current = now;
      const floor = pickFloorAtPoint(next.canvas, next.x, next.y);
      if (next.request !== hoverRequestRef.current) return;
      setHoveredFloor(floor);
      if (floor === null) {
        setHoverPoint(null);
        return;
      }
      setHoverPoint(getFloorTooltipPosition(next.pointer, next.tooltipSize));
    };
    hoverFrameRef.current = window.requestAnimationFrame(run);
  }, [pickFloorAtPoint, settled]);

  useEffect(() => {
    if (interactive) return;
    manualCameraRef.current = false;
    setManualControlsActive(false);
    invalidateHoverPick();
    setHoveredFloor(null);
    setHoverPoint(null);
  }, [interactive, invalidateHoverPick]);

  useEffect(() => () => invalidateHoverPick(), [invalidateHoverPick]);

  const handleOpticalZoom = useCallback((delta) => {
    if (!interactive || !Number.isFinite(delta)) return;
    setCameraFov((current) => Math.min(CAMERA_FOV, Math.max(
      CAMERA_MIN_FOV,
      current + delta,
    )));
  }, [interactive]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return undefined;

    const handleWheel = (event) => {
      const rect = model.getBoundingClientRect();
      if (!isPointWithinRect(event.clientX, event.clientY, rect)) return;

      const onCanvas = Boolean(event.target?.closest?.("canvas"));

      if (interactive && onCanvas && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.stopPropagation();
        handleOpticalZoom(event.deltaY * 0.012);
        return;
      }

      // PlayCanvas CameraControls always preventDefaults wheel on the canvas.
      // Floor rail and other controls outside the canvas can use native scrolling.
      if (!onCanvas) return;

      // Block PlayCanvas from swallowing the wheel event, but keep the browser's
      // native page scroll so momentum and direction stay correct at every position.
      event.stopPropagation();
    };

    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", handleWheel, { capture: true });
  }, [handleOpticalZoom, interactive]);

  const handleModelPointerMove = useCallback((event) => {
    if (!interactive) return;
    if (event.pointerType === "touch" && touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size === 2) {
        const [first, second] = [...touchPointersRef.current.values()];
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        if (pinchDistanceRef.current && distance > 0) {
          manualCameraRef.current = true;
          setManualControlsActive(true);
          handleOpticalZoom(Math.log(pinchDistanceRef.current / distance) * 10);
        }
        pinchDistanceRef.current = distance;
      }
    }
    const pointerStart = pointerStartRef.current;
    if (pointerStart && (event.buttons > 0 || event.pointerType === "touch")) {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) {
        draggedRef.current = true;
        manualCameraRef.current = true;
        setManualControlsActive(true);
      }
      invalidateHoverPick();
      setHoveredFloor(null);
      setHoverPoint(null);
      return;
    }
    if (event.pointerType === "touch") {
      invalidateHoverPick();
      setHoveredFloor(null);
      setHoverPoint(null);
      return;
    }
    if (draggedRef.current) return;
    if (!event.target.closest?.("canvas")) {
      invalidateHoverPick();
      if (!event.target.closest?.(".model-floor-rail button")) {
        setHoveredFloor(null);
        setHoverPoint(null);
      }
      return;
    }
    const canvas = event.currentTarget.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return;
    const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const request = ++hoverRequestRef.current;
    const tooltipSize = { width: rect.width, height: rect.height };
    scheduleHoverPick({
      canvas,
      x: pointer.x,
      y: pointer.y,
      pointer,
      request,
      tooltipSize,
    });
  }, [handleOpticalZoom, interactive, invalidateHoverPick, scheduleHoverPick]);

  const handleModelClick = useCallback((event) => {
    if (!interactive) return;
    const dragged = draggedRef.current || suppressClickRef.current;
    pointerStartRef.current = null;
    draggedRef.current = false;
    suppressClickRef.current = false;
    if (!event.target.closest?.("canvas")) {
      return;
    }
    if (dragged) return;
    const canvas = event.currentTarget.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const floorPick = pickFloorAtPoint(
      canvas,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
    if (floorPick === null) return;
    hoverRequestRef.current += 1;
    setHoverPoint(null);
    onSelectFloor(floorPick);
  }, [interactive, onSelectFloor, pickFloorAtPoint]);

  const handleResetView = useCallback((event) => {
    event.stopPropagation();
    pointerStartRef.current = null;
    draggedRef.current = false;
    suppressClickRef.current = false;
    setHoveredFloor(null);
    setHoverPoint(null);
    setCameraFov(CAMERA_FOV);
    manualCameraRef.current = false;
    setManualControlsActive(false);
    const resetPosition = settled
      ? CAMERA_END
      : getCameraPathPose(
        progressRef.current,
        CAMERA_START,
        CAMERA_END,
        CAMERA_TARGET,
        reducedMotion,
      ).position;
    const cameraEntity = cameraEntityRef.current;
    const controls = cameraEntity?.script?.cameraControls;
    if (controls?.reset) {
      controls.enabled = settled;
      controls.reset(CAMERA_FOCUS, new Vec3(...resetPosition));
      return;
    }
    cameraEntity?.setPosition(...resetPosition);
    cameraEntity?.lookAt(...CAMERA_TARGET, ...CAMERA_UP);
  }, [progressRef, reducedMotion, settled]);

  const fallback = <StaticFallback snapshot={snapshot} highlightedFloor={effectiveHighlightedFloor} onSelectFloor={onSelectFloor} />;

  return (
    <div
      ref={modelRef}
      className={`building-map building-model building-splat ${settled ? "is-settled" : "is-turning"} ${interactive ? "is-interactive" : ""}`}
      data-load-state={loadState.status}
      data-hovered-floor={hoveredFloor ?? undefined}
      data-filtered-floor={highlightedFloor ?? undefined}
      aria-busy={loadState.status === "loading"}
      onPointerDownCapture={(event) => {
        if (event.pointerType === "touch") {
          touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (touchPointersRef.current.size === 2) {
            const [first, second] = [...touchPointersRef.current.values()];
            pinchDistanceRef.current = Math.hypot(second.x - first.x, second.y - first.y);
          }
        }
        if (interactive && event.target.closest?.("canvas")) {
          const controls = cameraEntityRef.current?.script?.cameraControls;
          if (controls) controls.enabled = true;
          setManualControlsActive(true);
          pointerStartRef.current = { x: event.clientX, y: event.clientY };
          draggedRef.current = false;
          suppressClickRef.current = false;
        }
      }}
      onPointerMove={handleModelPointerMove}
      onPointerUp={(event) => {
        touchPointersRef.current.delete(event.pointerId);
        pinchDistanceRef.current = null;
        suppressClickRef.current = draggedRef.current;
        if (!draggedRef.current && !manualCameraRef.current) {
          setManualControlsActive(false);
          const controls = cameraEntityRef.current?.script?.cameraControls;
          if (controls) controls.enabled = settled;
          if (!settled) {
            const resetPosition = getCameraPathPose(
              progressRef.current,
              CAMERA_START,
              CAMERA_END,
              CAMERA_TARGET,
              reducedMotion,
            ).position;
            controls?._pose?.look(new Vec3(...resetPosition), CAMERA_FOCUS);
            controls?.reset?.(CAMERA_FOCUS, new Vec3(...resetPosition));
            cameraEntityRef.current?.setPosition(...resetPosition);
            cameraEntityRef.current?.lookAt(...CAMERA_TARGET, ...CAMERA_UP);
          }
        }
        pointerStartRef.current = null;
        draggedRef.current = false;
      }}
      onPointerCancel={(event) => {
        touchPointersRef.current.delete(event.pointerId);
        pinchDistanceRef.current = null;
        pointerStartRef.current = null;
        draggedRef.current = false;
        suppressClickRef.current = false;
        if (!manualCameraRef.current) setManualControlsActive(false);
        hoverRequestRef.current += 1;
      }}
      onPointerLeave={() => {
        touchPointersRef.current.clear();
        pinchDistanceRef.current = null;
        pointerStartRef.current = null;
        const wasDragged = draggedRef.current;
        draggedRef.current = false;
        suppressClickRef.current = false;
        if (!wasDragged && !manualCameraRef.current) setManualControlsActive(false);
        hoverRequestRef.current += 1;
        setHoveredFloor(null);
        setHoverPoint(null);
      }}
      onClick={handleModelClick}
    >
      {canRenderSplat ? (
        <WebGLErrorBoundary fallback={fallback} onError={handleRenderError}>
          <Application
            className="building-canvas building-splat-canvas"
            style={CANVAS_STYLE}
            fillMode={FILLMODE_NONE}
            resolutionMode={RESOLUTION_FIXED}
            deviceTypes={SPLAT_DEVICE_TYPES}
            graphicsDeviceOptions={GRAPHICS_OPTIONS}
            maxDeltaTime={0.05}
          >
            <RenderQuality />
            <SplatScene
              cameraEntityRef={cameraEntityRef}
              controlsActive={settled || manualControlsActive}
              fov={cameraFov}
              highlightedFloor={highlightedFloor}
              interactive={interactive}
              manualCameraRef={manualCameraRef}
              hoveredFloor={hoveredFloor}
              onCameraReady={handleCameraReady}
              onStateChange={reportState}
              pickerRef={pickerRef}
              progressRef={progressRef}
              reducedMotion={reducedMotion}
              settled={settled}
              splatReady={loadState.status === "ready"}
            />
          </Application>
        </WebGLErrorBoundary>
      ) : fallback}

      {canRenderSplat && loadState.status === "loading" && (
        <div className="model-loading model-loading-splat" role="status" aria-live="polite">
          <span />RECONSTRUCTING OFFICIAL VIEW · {Math.round(loadState.progress * 100)}%
        </div>
      )}
      {canRenderSplat && loadState.status === "error" && fallback}

      {canRenderSplat && loadState.status === "ready" && (
        <>
          <button
            className={`model-reset-view ${interactive ? "is-visible" : ""}`}
            type="button"
            tabIndex={interactive ? 0 : -1}
            onClick={handleResetView}
          >
            RESET VIEW
          </button>
          <div ref={railRef} className={`model-floor-rail ${interactive ? "is-visible" : ""}`} aria-label="Select building floor">
            {orderedFloors.map((floor) => {
              const summary = getFloorSummary(floor);
              return (
                <button
                  key={floor.number}
                  type="button"
                  data-floor={floor.number}
                  className={`${hoveredFloor === floor.number ? "is-active" : ""} ${hoveredFloor === null && highlightedFloor === floor.number ? "is-filter-match" : ""}`}
                  tabIndex={interactive ? 0 : -1}
                  aria-label={`${floorName(floor.number)}, ${summary.available} available residences`}
                  onMouseEnter={() => {
                    setHoveredFloor(floor.number);
                    setHoverPoint(null);
                  }}
                  onMouseLeave={() => setHoveredFloor(null)}
                  onFocus={() => {
                    setHoveredFloor(floor.number);
                    setHoverPoint(null);
                  }}
                  onBlur={() => setHoveredFloor(null)}
                  onKeyDown={(event) => handleFloorKeyDown(event, floor.number)}
                  onClick={() => onSelectFloor(floor.number)}
                >
                  <span>{String(floor.number).padStart(2, "0")}</span>
                  <i style={{ "--available": Math.max(0.08, summary.available / Math.max(summary.total, 1)) }} />
                </button>
              );
            })}
          </div>
          {interactive && hoveredFloorSummary && hoverPoint && (
            <div
              className="model-floor-tooltip"
              style={{ left: hoverPoint.x, top: hoverPoint.y }}
              aria-hidden="true"
            >
              <strong>{String(hoveredFloor).padStart(2, "0")}</strong>
              <span>FLOOR</span>
              <small>{hoveredFloorSummary.available} AVAILABLE</small>
            </div>
          )}
          <span className="model-floor-status" role="status" aria-live="polite" aria-atomic="true">
            {hoveredFloorSummary
              ? `${floorName(hoveredFloor)} highlighted, ${hoveredFloorSummary.available} available ${hoveredFloorSummary.available === 1 ? "residence" : "residences"}.`
              : ""}
          </span>
        </>
      )}

      <div className="building-model-instruction" aria-live="polite">
        <span className="model-instruction-index">{settled ? "LIVE 3D" : interactive ? "INTERACTIVE" : "SCROLL"}</span>
        <strong>
          {interactive ? (
            <>
              <span className="model-instruction-desktop">DRAG TO ROTATE · CTRL + WHEEL TO ZOOM · SELECT A FLOOR</span>
              <span className="model-instruction-mobile">DRAG TO ROTATE · PINCH TO ZOOM · TAP A FLOOR</span>
            </>
          ) : "TURNING FROM SIDE PROFILE TO FRONT VIEW"}
        </strong>
      </div>
      <span className="building-model-badge" aria-hidden="true">
        <span className="model-badge-desktop">OFFICIAL PROJECT RECONSTRUCTION · A BLOCK</span>
        <span className="model-badge-mobile">PROJECT REVERANCE · A BLOCK</span>
      </span>
    </div>
  );
}
