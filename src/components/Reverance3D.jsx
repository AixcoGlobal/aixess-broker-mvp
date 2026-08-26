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
  OrientedBox,
  Ray,
  RESOLUTION_FIXED,
  StandardMaterial,
  TYPE_FLOAT32,
  Vec2,
  Vec3,
} from "playcanvas";
import { getFloorSummary } from "../data/reveranceApi";
import {
  getCanvasScreenPoint,
  getCameraPathPose,
  getFloorTooltipPosition,
  getKeyboardFloorTarget,
} from "./reveranceSplatMath";
import {
  getFloorWorldTransform,
  REVERANCE_FLOOR_HIGHLIGHT_CANDIDATE_EPSILON,
  REVERANCE_FLOOR_HIGHLIGHT_HEIGHT,
  REVERANCE_FLOOR_HIGHLIGHT_MIN_FEATHER,
  REVERANCE_FLOOR_SIZE,
  REVERANCE_FLOOR_VOLUMES,
  REVERANCE_SPLAT_ROTATION,
  getWorldToFloorTransform,
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
const RENDER_SCALE = 2;
const RENDER_MAX_DIMENSION = 1440;
const CANVAS_STYLE = { width: "100%", height: "100%" };
const GRAPHICS_OPTIONS = {
  alpha: false,
  antialias: false,
  depth: true,
  stencil: false,
  powerPreference: "high-performance",
  preserveDrawingBuffer: false,
  desynchronized: false,
};
const FLOOR_PICK_BOXES = REVERANCE_FLOOR_VOLUMES.map((volume) => {
  const transform = getFloorWorldTransform(volume);
  const halfSize = new Vec3(...REVERANCE_FLOOR_SIZE).mulScalar(0.5);
  return {
    ...volume,
    box: new OrientedBox(
      transform,
      halfSize,
    ),
  };
});
const FLOOR_HIGHLIGHT_HALF_SIZE = new Float32Array(
  [
    REVERANCE_FLOOR_SIZE[0] * 0.5,
    REVERANCE_FLOOR_HIGHLIGHT_HEIGHT * 0.5,
    REVERANCE_FLOOR_SIZE[2] * 0.5,
  ],
);
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
      minPixelSize: gsplat.minPixelSize,
      radialSorting: gsplat.radialSorting,
    };
    let resizeFrame = 0;

    const resize = () => {
      resizeFrame = 0;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const scale = Math.min(
        RENDER_SCALE,
        RENDER_MAX_DIMENSION / Math.max(bounds.width, bounds.height),
      );
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
    resizeObserver.observe(canvas);
    resize();

    return () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      gsplat.radialSorting = previous.radialSorting;
      gsplat.antiAlias = previous.antiAlias;
      gsplat.minPixelSize = previous.minPixelSize;
      gsplat.dataFormat = previous.dataFormat;
    };
  }, [app]);

  return null;
}

function CameraRig({ fov, onCameraReady, progressRef, reducedMotion, settled }) {
  const entityRef = useRef(null);
  const initialPose = useMemo(
    () => getCameraPathPose(progressRef.current, CAMERA_START, CAMERA_END, CAMERA_TARGET, reducedMotion),
    [progressRef, reducedMotion],
  );

  const placeCamera = useCallback((position) => {
    const entity = entityRef.current;
    if (!entity) return;
    entity.setPosition(...position);
    entity.lookAt(...CAMERA_TARGET, ...CAMERA_UP);
  }, []);

  useEffect(() => {
    if (!settled) return;
    placeCamera(CAMERA_END);
  }, [placeCamera, settled]);

  useEffect(() => {
    if (!entityRef.current) return undefined;
    onCameraReady(entityRef.current);
    return () => onCameraReady(null);
  }, [onCameraReady]);

  useAppEvent("update", () => {
    if (settled) return;
    const target = getCameraPathPose(
      progressRef.current,
      CAMERA_START,
      CAMERA_END,
      CAMERA_TARGET,
      reducedMotion,
    ).position;
    // A trailing camera tween outlives the scroll event and makes WebGL's async
    // splat sorter display stale intermediate orders. Track the scroll pose exactly.
    placeCamera(target);
  });

  return (
    <Entity ref={entityRef} name="Official Reverance orbit camera" position={initialPose.position}>
      <Camera clearColor="#9aabb7" fov={fov} nearClip={1} farClip={500} />
      {settled && (
        <Script
          script={CameraControls}
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
          rotateDamping={0.97}
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

function FloorHighlight({ floorNumber }) {
  const app = useApp();
  const viewProjection = useRef(new Mat4());
  const inverseViewProjection = useRef(new Mat4());
  const floorFromClip = useRef(new Mat4());
  const floorWorldToLocal = useRef(new Mat4());
  const worldToClipW = useRef(new Float32Array(4));
  const pixelToLocalY = useRef(new Float32Array(2));

  useEffect(() => {
    const material = app.scene.gsplat.material;
    const varyings = app.scene.gsplat.varyings;
    const glslChunks = material.getShaderChunks("glsl");
    const wgslChunks = material.getShaderChunks("wgsl");
    const previousGlsl = glslChunks.get("gsplatModifyVS");
    const previousWgsl = wgslChunks.get("gsplatModifyVS");
    const previousFragmentGlsl = glslChunks.get("gsplatModifyPS");
    const previousFragmentWgsl = wgslChunks.get("gsplatModifyPS");
    const addedFloorSpan = !varyings.streams.some(({ name }) => name === "floorSpan");
    const parameterNames = [
      "uFloorWorldToLocal",
      "uFloorHalfSize",
      "uFloorHighlightEnabled",
      "uFloorWorldToClipW",
      "uFloorPixelToLocalY",
      "uDistantEnvironmentRadius",
    ];
    const previousParameters = parameterNames.map((name) => ({
      name,
      present: Boolean(material.getParameter(name)),
      data: material.getParameter(name)?.data,
    }));

    if (addedFloorSpan) {
      varyings.add([{ name: "floorSpan", type: TYPE_FLOAT32, components: 2 }]);
      varyings.apply(material);
    }
    glslChunks.set("gsplatModifyVS", FLOOR_HIGHLIGHT_GLSL);
    wgslChunks.set("gsplatModifyVS", FLOOR_HIGHLIGHT_WGSL);
    glslChunks.set("gsplatModifyPS", FLOOR_HIGHLIGHT_FRAGMENT_GLSL);
    wgslChunks.set("gsplatModifyPS", FLOOR_HIGHLIGHT_FRAGMENT_WGSL);
    material.update();

    return () => {
      if (previousGlsl === undefined) glslChunks.delete("gsplatModifyVS");
      else glslChunks.set("gsplatModifyVS", previousGlsl);
      if (previousWgsl === undefined) wgslChunks.delete("gsplatModifyVS");
      else wgslChunks.set("gsplatModifyVS", previousWgsl);
      if (previousFragmentGlsl === undefined) glslChunks.delete("gsplatModifyPS");
      else glslChunks.set("gsplatModifyPS", previousFragmentGlsl);
      if (previousFragmentWgsl === undefined) wgslChunks.delete("gsplatModifyPS");
      else wgslChunks.set("gsplatModifyPS", previousFragmentWgsl);
      if (addedFloorSpan) {
        varyings.remove(["floorSpan"]);
        varyings.apply(material);
      }
      previousParameters.forEach(({ name, present, data }) => {
        if (present) material.setParameter(name, data);
        else material.deleteParameter(name);
      });
      material.update();
    };
  }, [app]);

  useEffect(() => {
    const material = app.scene.gsplat.material;
    const volume = REVERANCE_FLOOR_VOLUMES.find((candidate) => candidate.number === floorNumber);
    const transform = new Mat4();
    if (volume) {
      transform.copy(getWorldToFloorTransform(volume));
    }
    floorWorldToLocal.current.copy(transform);

    material.setParameter("uFloorWorldToLocal", transform.data);
    material.setParameter("uFloorHalfSize", FLOOR_HIGHLIGHT_HALF_SIZE);
    material.setParameter("uFloorHighlightEnabled", volume ? 1 : 0);
    material.setParameter("uFloorWorldToClipW", worldToClipW.current);
    material.setParameter("uFloorPixelToLocalY", pixelToLocalY.current);
    material.setParameter("uDistantEnvironmentRadius", DISTANT_ENVIRONMENT_RADIUS);
    material.update();
  }, [app, floorNumber]);

  useAppEvent("update", () => {
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

    const material = app.scene.gsplat.material;
    material.setParameter("uFloorWorldToClipW", worldToClipW.current);
    material.setParameter("uFloorPixelToLocalY", pixelToLocalY.current);
  });

  return null;
}

function SplatScene({
  hoveredFloor,
  highlightedFloor,
  fov,
  interactive,
  onCameraReady,
  onStateChange,
  progressRef,
  reducedMotion,
  settled,
}) {
  return (
    <>
      <CameraRig
        fov={fov}
        onCameraReady={onCameraReady}
        progressRef={progressRef}
        reducedMotion={reducedMotion}
        settled={settled}
      />
      <HorizonEnvironment />
      <Entity name="Official Project Reverance reconstruction" rotation={REVERANCE_SPLAT_ROTATION}>
        <SplatAsset onStateChange={onStateChange} />
      </Entity>
      <FloorHighlight floorNumber={interactive ? hoveredFloor ?? highlightedFloor : null} />
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
  const cameraEntityRef = useRef(null);
  const pointerStartRef = useRef(null);
  const touchPointersRef = useRef(new Map());
  const pinchDistanceRef = useRef(null);
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

  useEffect(() => {
    if (interactive) return;
    setHoveredFloor(null);
    setHoverPoint(null);
  }, [interactive]);

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

  const pickFloor = useCallback((event) => {
    if (!interactive || !event.target.closest?.("canvas")) return null;
    const camera = cameraEntityRef.current?.camera;
    const canvas = event.currentTarget.querySelector("canvas");
    if (!camera || !canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    if (cssX < 0 || cssY < 0 || cssX > rect.width || cssY > rect.height) return null;
    const { x: screenX, y: screenY } = getCanvasScreenPoint(
      { x: cssX, y: cssY },
      { width: rect.width, height: rect.height },
      { width: canvas.width, height: canvas.height },
    );

    const start = camera.screenToWorld(screenX, screenY, camera.nearClip, new Vec3());
    const end = camera.screenToWorld(screenX, screenY, camera.farClip, new Vec3());
    const ray = new Ray(start, end.clone().sub(start).normalize());
    const intersection = new Vec3();
    let nearest = null;
    let nearestDistance = Infinity;

    for (const volume of FLOOR_PICK_BOXES) {
      if (!volume.box.intersectsRay(ray, intersection)) continue;
      const distance = intersection.distance(start);
      if (distance < nearestDistance) {
        nearest = volume.number;
        nearestDistance = distance;
      }
    }
    return nearest;
  }, [interactive]);

  const handleOpticalZoom = useCallback((delta) => {
    if (!settled || !Number.isFinite(delta)) return;
    setCameraFov((current) => Math.min(CAMERA_FOV, Math.max(
      CAMERA_MIN_FOV,
      current + delta,
    )));
  }, [settled]);

  const handleModelPointerMove = useCallback((event) => {
    if (!interactive) return;
    if (event.pointerType === "touch" && touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size === 2) {
        const [first, second] = [...touchPointersRef.current.values()];
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        if (pinchDistanceRef.current && distance > 0) {
          handleOpticalZoom(Math.log(pinchDistanceRef.current / distance) * 10);
        }
        pinchDistanceRef.current = distance;
      }
    }
    const pointerStart = pointerStartRef.current;
    if (pointerStart && (event.buttons > 0 || event.pointerType === "touch")) {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) {
        draggedRef.current = true;
      }
      setHoveredFloor(null);
      setHoverPoint(null);
      return;
    }
    if (event.pointerType === "touch") {
      setHoveredFloor(null);
      setHoverPoint(null);
      return;
    }
    if (draggedRef.current) return;
    if (!event.target.closest?.("canvas")) {
      if (!event.target.closest?.(".model-floor-rail button")) {
        setHoveredFloor(null);
        setHoverPoint(null);
      }
      return;
    }
    const floor = pickFloor(event);
    setHoveredFloor(floor);
    if (floor === null) {
      setHoverPoint(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverPoint(getFloorTooltipPosition(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      { width: rect.width, height: rect.height },
    ));
  }, [handleOpticalZoom, interactive, pickFloor]);

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
    const floor = pickFloor(event);
    if (floor !== null) {
      setHoverPoint(null);
      onSelectFloor(floor);
    }
  }, [interactive, onSelectFloor, pickFloor]);

  const handleResetView = useCallback((event) => {
    event.stopPropagation();
    pointerStartRef.current = null;
    draggedRef.current = false;
    suppressClickRef.current = false;
    setHoveredFloor(null);
    setHoverPoint(null);
    setCameraFov(CAMERA_FOV);
    const cameraEntity = cameraEntityRef.current;
    const controls = cameraEntity?.script?.cameraControls;
    if (controls?.reset) {
      controls.reset(CAMERA_FOCUS, new Vec3(...CAMERA_END));
      return;
    }
    cameraEntity?.setPosition(...CAMERA_END);
    cameraEntity?.lookAt(...CAMERA_TARGET, ...CAMERA_UP);
  }, []);

  const fallback = <StaticFallback snapshot={snapshot} highlightedFloor={effectiveHighlightedFloor} onSelectFloor={onSelectFloor} />;

  return (
    <div
      className={`building-map building-model building-splat ${settled ? "is-settled" : "is-turning"} ${interactive ? "is-interactive" : ""}`}
      data-load-state={loadState.status}
      data-hovered-floor={hoveredFloor ?? undefined}
      data-filtered-floor={highlightedFloor ?? undefined}
      aria-busy={loadState.status === "loading"}
      onPointerDown={(event) => {
        if (event.pointerType === "touch") {
          touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (touchPointersRef.current.size === 2) {
            const [first, second] = [...touchPointersRef.current.values()];
            pinchDistanceRef.current = Math.hypot(second.x - first.x, second.y - first.y);
          }
        }
        if (interactive && event.target.closest?.("canvas")) {
          pointerStartRef.current = { x: event.clientX, y: event.clientY };
          draggedRef.current = false;
          suppressClickRef.current = false;
        }
      }}
      onPointerMove={handleModelPointerMove}
      onWheel={(event) => {
        if (!settled || !event.target.closest?.("canvas")) return;
        event.preventDefault();
        handleOpticalZoom(event.deltaY * 0.012);
      }}
      onPointerUp={(event) => {
        touchPointersRef.current.delete(event.pointerId);
        pinchDistanceRef.current = null;
        suppressClickRef.current = draggedRef.current;
        pointerStartRef.current = null;
        draggedRef.current = false;
      }}
      onPointerCancel={(event) => {
        touchPointersRef.current.delete(event.pointerId);
        pinchDistanceRef.current = null;
        pointerStartRef.current = null;
        draggedRef.current = false;
        suppressClickRef.current = false;
      }}
      onPointerLeave={() => {
        touchPointersRef.current.clear();
        pinchDistanceRef.current = null;
        pointerStartRef.current = null;
        draggedRef.current = false;
        suppressClickRef.current = false;
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
            deviceTypes={[DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2]}
            graphicsDeviceOptions={GRAPHICS_OPTIONS}
            maxDeltaTime={0.05}
          >
            <RenderQuality />
            <SplatScene
              fov={cameraFov}
              highlightedFloor={highlightedFloor}
              interactive={interactive}
              hoveredFloor={hoveredFloor}
              onCameraReady={handleCameraReady}
              onStateChange={reportState}
              progressRef={progressRef}
              reducedMotion={reducedMotion}
              settled={settled}
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
            className={`model-reset-view ${settled ? "is-visible" : ""}`}
            type="button"
            tabIndex={settled ? 0 : -1}
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
          {settled ? (
            <>
              <span className="model-instruction-desktop">DRAG TO ROTATE · WHEEL TO ZOOM · SELECT A FLOOR</span>
              <span className="model-instruction-mobile">DRAG TO ROTATE · PINCH TO ZOOM · TAP A FLOOR</span>
            </>
          ) : interactive ? "HOVER OR SELECT A FLOOR · SCROLL TO SETTLE FRONT VIEW" : "TURNING FROM SIDE PROFILE TO FRONT VIEW"}
        </strong>
      </div>
      <span className="building-model-badge" aria-hidden="true">
        <span className="model-badge-desktop">OFFICIAL PROJECT RECONSTRUCTION · A BLOCK</span>
        <span className="model-badge-mobile">PROJECT REVERANCE · A BLOCK</span>
      </span>
    </div>
  );
}
