import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, Entity } from "@playcanvas/react";
import { Camera, GSplat, Render, Script } from "@playcanvas/react/components";
import { useAppEvent, useMaterial, useSplat } from "@playcanvas/react/hooks";
import { CameraControls } from "playcanvas/scripts/esm/camera-controls.mjs";
import {
  BLEND_NORMAL,
  DEVICETYPE_WEBGL2,
  DEVICETYPE_WEBGPU,
  FILLMODE_NONE,
  RESOLUTION_AUTO,
  Vec2,
  Vec3,
} from "playcanvas";
import { createFloorVolumes, getSplatPose } from "./reveranceSplatMath";
import "./ReveranceSplatPrototype.css";

const DEFAULT_PROGRESS_REF = { current: 0 };
const DEFAULT_FLOORS = Array.from({ length: 15 }, (_, index) => ({ number: index + 2 }));
const CAMERA_PITCH_RANGE = new Vec2(-7, 8);
const CAMERA_ZOOM_RANGE = new Vec2(80, 175);
const CAMERA_FOCUS = new Vec3(0, 0, 0);
const CANVAS_STYLE = { width: "100%", height: "100%" };
const GRAPHICS_OPTIONS = {
  alpha: true,
  antialias: false,
  depth: true,
  stencil: false,
  powerPreference: "high-performance",
  preserveDrawingBuffer: false,
  desynchronized: true,
};

function usePrefersReducedMotion(explicitPreference) {
  const [systemPreference, setSystemPreference] = useState(() => (
    typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ));

  useEffect(() => {
    if (
      explicitPreference !== undefined
      || typeof window === "undefined"
      || typeof window.matchMedia !== "function"
    ) return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemPreference(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [explicitPreference]);

  return explicitPreference ?? systemPreference;
}

function ScrollDrivenEntity({ children, progressRef, reducedMotion }) {
  const entityRef = useRef(null);
  const poseRef = useRef(getSplatPose(progressRef.current, reducedMotion));

  useAppEvent("update", (delta) => {
    const entity = entityRef.current;
    if (!entity) return;

    const target = getSplatPose(progressRef.current, reducedMotion);
    const response = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 5.5);
    const current = poseRef.current;
    current.rotationY += (target.rotationY - current.rotationY) * response;
    current.positionX += (target.positionX - current.positionX) * response;
    current.scale += (target.scale - current.scale) * response;

    entity.setLocalPosition(current.positionX, 0, 0);
    entity.setLocalEulerAngles(0, current.rotationY, 0);
    entity.setLocalScale(current.scale, current.scale, current.scale);
  });

  const initialPose = poseRef.current;
  return (
    <Entity
      ref={entityRef}
      name="Reverance A scroll pose"
      position={[initialPose.positionX, 0, 0]}
      rotation={[0, initialPose.rotationY, 0]}
      scale={[initialPose.scale, initialPose.scale, initialPose.scale]}
    >
      {children}
    </Entity>
  );
}

function FloorVolumes({ floors, floorLayout, interactive, onFloorHover, onFloorSelect }) {
  const invisibleMaterial = useMaterial({
    diffuse: "white",
    opacity: 0,
    blendType: BLEND_NORMAL,
    depthWrite: false,
    useFog: false,
  });
  const volumes = useMemo(() => createFloorVolumes(floors, floorLayout), [floorLayout, floors]);

  return volumes.map((volume) => (
    <Entity
      key={volume.floorNumber}
      name={`Floor ${volume.floorNumber} pick volume`}
      position={volume.position}
      scale={volume.scale}
      onPointerOver={interactive ? (event) => {
        event.stopPropagation();
        onFloorHover?.(volume.floorNumber);
      } : undefined}
      onPointerOut={interactive ? (event) => {
        event.stopPropagation();
        onFloorHover?.(null);
      } : undefined}
      onClick={interactive ? (event) => {
        event.stopPropagation();
        onFloorSelect?.(volume.floorNumber);
      } : undefined}
    >
      <Render
        type="box"
        material={invisibleMaterial}
        castShadows={false}
        receiveShadows={false}
        isStatic={false}
      />
    </Entity>
  ));
}

function SplatAsset({ splatUrl, onStateChange }) {
  const { asset, error, loading, subscribe } = useSplat(splatUrl);

  useEffect(() => subscribe(({ progress }) => {
    onStateChange({ status: "loading", progress: Math.min(1, Math.max(0, progress || 0)), error: null });
  }), [onStateChange, subscribe]);

  useEffect(() => {
    if (error) {
      onStateChange({ status: "error", progress: 0, error });
    } else if (asset && !loading) {
      onStateChange({ status: "ready", progress: 1, error: null });
    } else {
      onStateChange({ status: "loading", progress: 0, error: null });
    }
  }, [asset, error, loading, onStateChange]);

  if (!asset) return null;
  return <GSplat asset={asset} castShadows={false} />;
}

function CameraRig({ settled }) {
  return (
    <Entity name="Reverance A camera" position={[0, 0, 128]}>
      <Camera clearColor="#09131d" fov={34} nearClip={0.1} farClip={400} />
      {settled && (
        <Script
          script={CameraControls}
          enableOrbit
          enableFly={false}
          enablePan
          focusPoint={CAMERA_FOCUS}
          pitchRange={CAMERA_PITCH_RANGE}
          zoomRange={CAMERA_ZOOM_RANGE}
          rotateSpeed={0.16}
          zoomSpeed={0.001}
          rotateDamping={0.975}
          zoomDamping={0.965}
          focusDamping={0.94}
        />
      )}
    </Entity>
  );
}

function SplatScene({
  floorLayout,
  floors,
  modelOffset,
  modelRotation,
  modelScale,
  onFloorHover,
  onFloorSelect,
  onStateChange,
  progressRef,
  reducedMotion,
  settled,
  splatUrl,
}) {
  return (
    <>
      <CameraRig settled={settled} />
      <ScrollDrivenEntity progressRef={progressRef} reducedMotion={reducedMotion}>
        <Entity
          name="Reverance A calibrated content"
          position={modelOffset}
          rotation={modelRotation}
          scale={modelScale}
        >
          <SplatAsset splatUrl={splatUrl} onStateChange={onStateChange} />
          <FloorVolumes
            floors={floors}
            floorLayout={floorLayout}
            interactive={settled}
            onFloorHover={onFloorHover}
            onFloorSelect={onFloorSelect}
          />
        </Entity>
      </ScrollDrivenEntity>
    </>
  );
}

class SplatRenderBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

/**
 * Unmounted PlayCanvas integration spike for a cropped Reverance A SOG asset.
 * Keep floor focus in the DOM side rail: pass its focused floor to onFloorHover,
 * and use getKeyboardFloorTarget() from reveranceSplatMath for Arrow/Home/End keys.
 */
export function ReveranceSplatPrototype({
  className = "",
  floorLayout,
  floors = DEFAULT_FLOORS,
  modelOffset = [0, -32.79, 0],
  modelRotation = [0, 0, 0],
  modelScale = [1, 1, 1],
  onFloorHover,
  onFloorSelect,
  onStateChange,
  progressRef = DEFAULT_PROGRESS_REF,
  reducedMotion,
  settled = false,
  splatUrl,
}) {
  const prefersReducedMotion = usePrefersReducedMotion(reducedMotion);
  const [loadState, setLoadState] = useState({ status: "loading", progress: 0, error: null });
  const onStateChangeRef = useRef(onStateChange);
  const hasUrl = typeof splatUrl === "string" && splatUrl.trim().length > 0;

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const reportState = useCallback((nextState) => {
    setLoadState(nextState);
    onStateChangeRef.current?.(nextState);
  }, []);

  useEffect(() => {
    const next = hasUrl
      ? { status: "loading", progress: 0, error: null }
      : { status: "error", progress: 0, error: "A Reverance SOG URL is required." };
    reportState(next);
  }, [hasUrl, reportState, splatUrl]);

  const handleRenderError = useCallback((error) => {
    reportState({
      status: "error",
      progress: 0,
      error: error?.message || "The PlayCanvas renderer could not start.",
    });
  }, [reportState]);

  return (
    <div
      className={`reverance-splat-prototype ${className}`.trim()}
      data-load-state={loadState.status}
      data-reduced-motion={prefersReducedMotion ? "true" : "false"}
      data-settled={settled ? "true" : "false"}
      aria-busy={loadState.status === "loading"}
    >
      {hasUrl && (
        <SplatRenderBoundary key={splatUrl} onError={handleRenderError}>
          <Application
            className="reverance-splat-prototype__canvas"
            style={CANVAS_STYLE}
            fillMode={FILLMODE_NONE}
            resolutionMode={RESOLUTION_AUTO}
            deviceTypes={[DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2]}
            graphicsDeviceOptions={GRAPHICS_OPTIONS}
            maxDeltaTime={0.05}
          >
            <SplatScene
              floorLayout={floorLayout}
              floors={floors}
              modelOffset={modelOffset}
              modelRotation={modelRotation}
              modelScale={modelScale}
              onFloorHover={onFloorHover}
              onFloorSelect={onFloorSelect}
              onStateChange={reportState}
              progressRef={progressRef}
              reducedMotion={prefersReducedMotion}
              settled={settled}
              splatUrl={splatUrl}
            />
          </Application>
        </SplatRenderBoundary>
      )}

      {loadState.status !== "ready" && (
        <div
          className="reverance-splat-prototype__status"
          role={loadState.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {loadState.status === "error"
            ? loadState.error
            : `Loading Reverance A model… ${Math.round(loadState.progress * 100)}%`}
        </div>
      )}
      <span className="reverance-splat-prototype__sr-only" aria-live="polite">
        {prefersReducedMotion ? "Reduced motion mode is active; scroll rotation is disabled." : ""}
      </span>
    </div>
  );
}
