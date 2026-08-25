import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, Entity } from "@playcanvas/react";
import { Camera, GSplat, Script } from "@playcanvas/react/components";
import { useApp, useAppEvent, useSplat } from "@playcanvas/react/hooks";
import { CameraControls } from "playcanvas/scripts/esm/camera-controls.mjs";
import {
  DEVICETYPE_WEBGL2,
  DEVICETYPE_WEBGPU,
  FILLMODE_NONE,
  Mat4,
  OrientedBox,
  Quat,
  Ray,
  RESOLUTION_AUTO,
  Vec2,
  Vec3,
} from "playcanvas";
import { getFloorSummary } from "../data/reveranceApi";
import {
  getCameraPathPose,
  getFloorTooltipPosition,
  getKeyboardFloorTarget,
} from "./reveranceSplatMath";

const SPLAT_URL = "/assets/reverance-3d/reverance-official-97.sog?v=acb1246f";
const CAMERA_FOV = 41.09622780396063;
const CAMERA_TARGET = [-0.10454206208274158, 0.0008068618049380962, 0.10121364916726469];
const CAMERA_START = [2.504352717259611, 0.014715904099223222, 2.7438049729703717];
const CAMERA_END = [2.571008603437904, -0.010401810476404838, -2.4755136248454392];
const CAMERA_UP = [-0.000569128058664063, 0.9999881472011365, -0.004835447289666561];
const CAMERA_FOCUS = new Vec3(...CAMERA_TARGET);
const CAMERA_PITCH_RANGE = new Vec2(-0.08, 0.08);
const CAMERA_YAW_RANGE = new Vec2(-360, 360);
const CAMERA_ZOOM_RANGE = new Vec2(3.35, 4.2);
const CANVAS_STYLE = { width: "100%", height: "100%" };
const GRAPHICS_OPTIONS = {
  alpha: false,
  antialias: false,
  depth: true,
  stencil: false,
  powerPreference: "high-performance",
  preserveDrawingBuffer: false,
  desynchronized: true,
};
const FLOOR_ROTATION = [-179.71965180947012, 8.877656364351859, -179.92406130155297];
const FLOOR_SCALE = [0.8217690190291913, 0.07267751885234101, 0.4953117381288637];
const FLOOR_VOLUMES = [
  [2, 0.3465929124598087, -0.8097063560444595, -0.46356909413651887],
  [3, 0.3465468627576663, -0.7289545140944962, -0.46395948241105345],
  [4, 0.3465008130555239, -0.6482026721445328, -0.464349870685588],
  [5, 0.3464547633533815, -0.5674508301945694, -0.46474025896012255],
  [6, 0.34640871365123904, -0.486698988244606, -0.46513064723465714],
  [7, 0.34636266394909665, -0.4059471462946426, -0.46552103550919166],
  [8, 0.34631661424695426, -0.3251953043446792, -0.46591142378372624],
  [9, 0.3462705645448118, -0.24444346239471576, -0.46630181205826077],
  [10, 0.3462245148426694, -0.16369162044475238, -0.46669220033279535],
  [11, 0.346178465140527, -0.08293977849478897, -0.46708258860732993],
  [12, 0.3461324154383846, -0.002187936544825593, -0.46747297688186445],
  [13, 0.3460863657362422, 0.07856390540513782, -0.46786336515639904],
  [14, 0.3460403160340998, 0.15931574735510118, -0.46825375343093356],
  [15, 0.3459942663319574, 0.24006758930506455, -0.46864414170546814],
  [16, 0.34594821662981495, 0.32081943125502793, -0.4690345299800027],
].map(([number, x, y, z]) => ({ number, position: [x, y, z] }));
const FLOOR_PICK_BOXES = FLOOR_VOLUMES.map((volume) => {
  const rotation = new Quat().setFromEulerAngles(...FLOOR_ROTATION);
  const transform = new Mat4().setTRS(new Vec3(...volume.position), rotation, Vec3.ONE);
  return {
    ...volume,
    box: new OrientedBox(transform, new Vec3(...FLOOR_SCALE).mulScalar(0.5)),
  };
});
const FLOOR_HIGHLIGHT_HALF_SIZE = new Float32Array(FLOOR_SCALE.map((value) => value * 0.5));
const FLOOR_HIGHLIGHT_GLSL = `
uniform mat4 uFloorWorldToLocal;
uniform vec3 uFloorHalfSize;
uniform float uFloorHighlightEnabled;

void modifySplatCenter(inout vec3 center) {}
void modifySplatRotationScale(vec3 originalCenter, vec3 modifiedCenter, inout vec4 rotation, inout vec3 scale) {}
void modifySplatColor(vec3 center, inout vec4 color) {
  vec3 localCenter = abs((uFloorWorldToLocal * vec4(center, 1.0)).xyz);
  bool insideFloor = localCenter.x <= uFloorHalfSize.x
    && localCenter.y <= uFloorHalfSize.y
    && localCenter.z <= uFloorHalfSize.z;
  if (uFloorHighlightEnabled > 0.5 && insideFloor) {
    color.rgb = mix(color.rgb, vec3(1.0, 0.36, 0.04), 0.58);
  }
}
`;
const FLOOR_HIGHLIGHT_WGSL = `
uniform uFloorWorldToLocal: mat4x4f;
uniform uFloorHalfSize: vec3f;
uniform uFloorHighlightEnabled: f32;

fn modifySplatCenter(center: ptr<function, vec3f>) {}
fn modifySplatRotationScale(originalCenter: vec3f, modifiedCenter: vec3f, rotation: ptr<function, vec4f>, scale: ptr<function, vec3f>) {}
fn modifySplatColor(center: vec3f, color: ptr<function, vec4f>) {
  let localCenter = abs((uniform.uFloorWorldToLocal * vec4f(center, 1.0)).xyz);
  let insideFloor = all(localCenter <= uniform.uFloorHalfSize);
  if (uniform.uFloorHighlightEnabled > 0.5 && insideFloor) {
    let rgb = mix((*color).rgb, vec3f(1.0, 0.36, 0.04), 0.58);
    *color = vec4f(rgb, (*color).a);
  }
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

function CameraRig({ onCameraReady, progressRef, reducedMotion, settled }) {
  const entityRef = useRef(null);
  const initialPose = useMemo(
    () => getCameraPathPose(progressRef.current, CAMERA_START, CAMERA_END, CAMERA_TARGET, reducedMotion),
    [progressRef, reducedMotion],
  );
  const smoothedPosition = useRef([...initialPose.position]);

  const placeCamera = useCallback((position) => {
    const entity = entityRef.current;
    if (!entity) return;
    entity.setPosition(...position);
    entity.lookAt(...CAMERA_TARGET, ...CAMERA_UP);
  }, []);

  useEffect(() => {
    if (!settled) return;
    smoothedPosition.current = [...CAMERA_END];
    placeCamera(CAMERA_END);
  }, [placeCamera, settled]);

  useEffect(() => {
    if (!entityRef.current) return undefined;
    onCameraReady(entityRef.current);
    return () => onCameraReady(null);
  }, [onCameraReady]);

  useAppEvent("update", (delta) => {
    if (settled) return;
    const target = getCameraPathPose(
      progressRef.current,
      CAMERA_START,
      CAMERA_END,
      CAMERA_TARGET,
      reducedMotion,
    ).position;
    const response = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 7.2);
    const current = smoothedPosition.current;
    for (let index = 0; index < 3; index += 1) {
      current[index] += (target[index] - current[index]) * response;
    }
    placeCamera(current);
  });

  return (
    <Entity ref={entityRef} name="Official Reverance orbit camera" position={initialPose.position}>
      <Camera clearColor="#9aabb7" fov={CAMERA_FOV} nearClip={0.5} farClip={500} />
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
          zoomSpeed={0.0008}
          moveDamping={0.96}
          rotateDamping={0.97}
          zoomDamping={0.965}
          focusDamping={0.93}
        />
      )}
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

  useEffect(() => {
    const material = app.scene.gsplat.material;
    const glslChunks = material.getShaderChunks("glsl");
    const wgslChunks = material.getShaderChunks("wgsl");
    const previousGlsl = glslChunks.get("gsplatModifyVS");
    const previousWgsl = wgslChunks.get("gsplatModifyVS");
    const parameterNames = [
      "uFloorWorldToLocal",
      "uFloorHalfSize",
      "uFloorHighlightEnabled",
    ];
    const previousParameters = parameterNames.map((name) => ({
      name,
      present: Boolean(material.getParameter(name)),
      data: material.getParameter(name)?.data,
    }));

    glslChunks.set("gsplatModifyVS", FLOOR_HIGHLIGHT_GLSL);
    wgslChunks.set("gsplatModifyVS", FLOOR_HIGHLIGHT_WGSL);
    material.update();

    return () => {
      if (previousGlsl === undefined) glslChunks.delete("gsplatModifyVS");
      else glslChunks.set("gsplatModifyVS", previousGlsl);
      if (previousWgsl === undefined) wgslChunks.delete("gsplatModifyVS");
      else wgslChunks.set("gsplatModifyVS", previousWgsl);
      previousParameters.forEach(({ name, present, data }) => {
        if (present) material.setParameter(name, data);
        else material.deleteParameter(name);
      });
      material.update();
    };
  }, [app]);

  useEffect(() => {
    const material = app.scene.gsplat.material;
    const volume = FLOOR_VOLUMES.find((candidate) => candidate.number === floorNumber);
    const transform = new Mat4();
    if (volume) {
      transform.setTRS(
        new Vec3(...volume.position),
        new Quat().setFromEulerAngles(...FLOOR_ROTATION),
        Vec3.ONE,
      ).invert();
    }

    material.setParameter("uFloorWorldToLocal", transform.data);
    material.setParameter("uFloorHalfSize", FLOOR_HIGHLIGHT_HALF_SIZE);
    material.setParameter("uFloorHighlightEnabled", volume ? 1 : 0);
    material.update();
  }, [app, floorNumber]);

  return null;
}

function SplatScene({
  hoveredFloor,
  onCameraReady,
  onStateChange,
  progressRef,
  reducedMotion,
  settled,
}) {
  return (
    <>
      <CameraRig
        onCameraReady={onCameraReady}
        progressRef={progressRef}
        reducedMotion={reducedMotion}
        settled={settled}
      />
      <Entity name="Official Project Reverance reconstruction" rotation={[0, 0, 180]}>
        <SplatAsset onStateChange={onStateChange} />
      </Entity>
      {settled && <FloorHighlight floorNumber={hoveredFloor} />}
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

function StaticFallback({ snapshot, onSelectFloor }) {
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

export function Reverance3D({ snapshot, onSelectFloor, settled, progressRef }) {
  const [hoveredFloor, setHoveredFloor] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [loadState, setLoadState] = useState({ status: "loading", progress: 0, error: null });
  const cameraEntityRef = useRef(null);
  const pointerStartRef = useRef(null);
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

  useEffect(() => {
    if (settled) return;
    setHoveredFloor(null);
    setHoverPoint(null);
  }, [settled]);

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
    if (!settled || !event.target.closest?.("canvas")) return null;
    const camera = cameraEntityRef.current?.camera;
    const canvas = event.currentTarget.querySelector("canvas");
    if (!camera || !canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    if (screenX < 0 || screenY < 0 || screenX > rect.width || screenY > rect.height) return null;

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
  }, [settled]);

  const handleModelPointerMove = useCallback((event) => {
    if (!settled) return;
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
  }, [pickFloor, settled]);

  const handleModelClick = useCallback((event) => {
    if (!settled) return;
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
  }, [onSelectFloor, pickFloor, settled]);

  const handleResetView = useCallback((event) => {
    event.stopPropagation();
    pointerStartRef.current = null;
    draggedRef.current = false;
    suppressClickRef.current = false;
    setHoveredFloor(null);
    setHoverPoint(null);
    const cameraEntity = cameraEntityRef.current;
    const controls = cameraEntity?.script?.cameraControls;
    if (controls?.reset) {
      controls.reset(CAMERA_FOCUS, new Vec3(...CAMERA_END));
      return;
    }
    cameraEntity?.setPosition(...CAMERA_END);
    cameraEntity?.lookAt(...CAMERA_TARGET, ...CAMERA_UP);
  }, []);

  const fallback = <StaticFallback snapshot={snapshot} onSelectFloor={onSelectFloor} />;

  return (
    <div
      className={`building-map building-model building-splat ${settled ? "is-settled" : "is-turning"}`}
      data-load-state={loadState.status}
      data-hovered-floor={hoveredFloor ?? undefined}
      aria-busy={loadState.status === "loading"}
      onPointerDown={(event) => {
        if (event.target.closest?.("canvas")) {
          pointerStartRef.current = { x: event.clientX, y: event.clientY };
          draggedRef.current = false;
          suppressClickRef.current = false;
        }
      }}
      onPointerMove={handleModelPointerMove}
      onPointerUp={() => {
        suppressClickRef.current = draggedRef.current;
        pointerStartRef.current = null;
        draggedRef.current = false;
      }}
      onPointerCancel={() => {
        pointerStartRef.current = null;
        draggedRef.current = false;
        suppressClickRef.current = false;
      }}
      onPointerLeave={() => {
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
            resolutionMode={RESOLUTION_AUTO}
            deviceTypes={[DEVICETYPE_WEBGL2, DEVICETYPE_WEBGPU]}
            graphicsDeviceOptions={GRAPHICS_OPTIONS}
            maxDeltaTime={0.05}
          >
            <SplatScene
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
          <div ref={railRef} className={`model-floor-rail ${settled ? "is-visible" : ""}`} aria-label="Select building floor">
            {orderedFloors.map((floor) => {
              const summary = getFloorSummary(floor);
              return (
                <button
                  key={floor.number}
                  type="button"
                  data-floor={floor.number}
                  className={hoveredFloor === floor.number ? "is-active" : ""}
                  tabIndex={settled ? 0 : -1}
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
          {settled && hoveredFloorSummary && hoverPoint && (
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
        <span className="model-instruction-index">{settled ? "LIVE 3D" : "SCROLL"}</span>
        <strong>
          {settled ? (
            <>
              <span className="model-instruction-desktop">DRAG TO ROTATE · WHEEL TO ZOOM · SELECT A FLOOR</span>
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
