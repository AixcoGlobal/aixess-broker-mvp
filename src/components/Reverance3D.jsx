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
import { useLanguage } from "../i18n.jsx";
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
  Pose,
  RESOLUTION_FIXED,
  StandardMaterial,
  TYPE_FLOAT32,
  Vec2,
  Vec3,
} from "playcanvas";
import { getFloorSummary } from "../data/reveranceApi";
import { normalizeWheelDelta } from "../utils/pageScroll";
import {
  getFloorTooltipPosition,
  getKeyboardFloorTarget,
  getScrollCameraPathPose,
} from "./reveranceSplatMath";
import {
  REVERANCE_FLOOR_HIGHLIGHT_CANDIDATE_EPSILON,
  REVERANCE_FLOOR_HIGHLIGHT_HEIGHT,
  REVERANCE_FLOOR_HIGHLIGHT_MIN_FEATHER,
  REVERANCE_FLOOR_SIZE,
  REVERANCE_BLOCK_B_OFFSET,
  REVERANCE_SPLAT_ROTATION,
  getFloorVisualYOffset,
  getFloorVolumesForBlock,
  getHighlightWorldToFloorTransform,
  pickBlockFloorFromScreen,
} from "./reveranceFloorHighlight";

const SPLAT_URL = "/assets/reverance-3d/reverance-official-97.sog?v=acb1246f";
const HORIZON_URL = "/assets/reverance-3d/reverance-official-horizon.webp";
const CAMERA_FOV = 41.09622780396063;
const CAMERA_MIN_FOV = 31;
const CAMERA_MAX_FOV = 62;
const CAMERA_TARGET = [-0.10454206208274158, 0.0008068618049380962, 0.10121364916726469];
const CAMERA_START = [2.504352717259611, 0.014715904099223222, 2.7438049729703717];
const CAMERA_END = [2.571008603437904, -0.010401810476404838, -2.4755136248454392];
// B sits behind A in the accepted orbit. Its front view is on the opposite
// side of the paired masses, so it needs both the measured block offset and a
// calibrated opposite-side camera direction; translating A's camera alone
// leaves the camera looking at A's façade.
const CAMERA_BLOCK_B_TARGET = CAMERA_TARGET.map((value, index) => value + REVERANCE_BLOCK_B_OFFSET[index]);
const CAMERA_BLOCK_B_FRONT = [-2.978120017051697, -0.007769220508635044, 3.8795562171936035];
const CAMERA_FOCUS = new Vec3(...CAMERA_TARGET);
// The calibrated side-to-front path pitches between -0.215° and +0.173°. The
// orbit range must contain the whole path, otherwise CameraControls clamps the
// pose the moment it takes over and the settle visibly snaps.
const CAMERA_PITCH_RANGE = new Vec2(-0.25, 0.25);
const CAMERA_YAW_RANGE = new Vec2(-360, 360);
const CAMERA_ZOOM_RANGE = new Vec2(3.7123, 3.7165);
const CAMERA_FOCUS_DAMPING = 0.99;
const BLOCK_FOCUS_DAMPING = 0.997;
const DISTANT_ENVIRONMENT_RADIUS = 20;
const DRAG_THRESHOLD_PX = 6;
const WHEEL_ZOOM_DEGREES_PER_PIXEL = 0.012;
const PINCH_ZOOM_DEGREES_PER_LOG_UNIT = 10;
const FOV_TWEEN_RATE = 16;
const FOV_TWEEN_EPSILON = 0.01;
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
  // A Gaussian may cross the slab even when its centre is on another floor.
  // Select the tower here; clip the storey per fragment below.
  bool insideFloor = all(lessThanEqual(abs(localCenter.xz), uFloorHalfSize.xz));
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
  let insideFloor = all(abs(localCenter.xz) <= uniform.uFloorHalfSize.xz);
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

const scratchPose = new Pose();
const scratchPosition = new Vec3();

export function getBlockCameraPose(blockId) {
  if (blockId === "ReveranceB") {
    return {
      target: CAMERA_BLOCK_B_TARGET,
      position: CAMERA_BLOCK_B_FRONT,
    };
  }
  return {
    target: CAMERA_TARGET,
    position: CAMERA_END,
  };
}

/**
 * PlayCanvas' stock CameraControls wraps the orbit target yaw with `% 360`
 * while the damped current yaw lags behind it. Crossing ±360° therefore makes
 * the camera whip almost a full turn the other way. Keeping both poses inside
 * (-180°, 180°] before every update means the wrap can never trigger.
 */
class ReveranceCameraControls extends CameraControls {
  static scriptName = "reveranceCameraControls";

  // The stock control redirects focus to orbit whenever fly is disabled.
  // Allow focus mode only for a programmed camera turn; fly stays disabled.
  _setMode(mode) {
    const allowFocus = mode === "focus" && !this.enableFly && this.enableOrbit;
    if (allowFocus) this.enableFly = true;
    super._setMode(mode);
    if (allowFocus) this.enableFly = false;
  }

  /**
   * While the scroll-driven side-to-front path owns the camera, skip writing a
   * pose. CameraControls.update() always overwrites the entity, which otherwise
   * fights the scroll camera and makes the turn hitch.
   */
  scrollLocked = true;
  floorGestureLocked = false;

  drainInput() {
    this._desktopInput?.read?.();
    const mobile = this._orbitMobileInput?.read?.();
    // Discard motion while locked, but retain touch-count transitions so the
    // next one-finger drag is not mistaken for a two-finger pan.
    if (mobile && this._state) this._state.touches += mobile.count[0];
    this._flyMobileInput?.read?.();
    this._gamepadInput?.read?.();
  }

  update(dt) {
    if (this.scrollLocked || this.floorGestureLocked) {
      this.drainInput();
      return;
    }
    const orbit = this._orbitController;
    const target = orbit?._targetRootPose?.angles;
    const current = orbit?._rootPose?.angles;
    if (target && current && Math.abs(target.y) > 180) {
      const shift = target.y > 0 ? -360 : 360;
      target.y += shift;
      current.y += shift;
    }
    super.update(dt);
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function floorName(number, t) {
  return `${t("floorLabelPrefix")} ${String(number).padStart(2, "0")}`;
}

function getAdaptiveRenderScale(width, height) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const longest = Math.max(width, height);
  if (longest <= 0) return 1;
  const capScale = RENDER_MAX_DIMENSION / longest;
  const mobileCap = width <= MOBILE_RENDER_WIDTH ? RENDER_SCALE_MOBILE_MAX : RENDER_SCALE_MAX;
  return Math.min(Math.max(dpr, 1), mobileCap, capScale);
}

export function syncCanvasResolution(app, canvas) {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return false;
  const scale = getAdaptiveRenderScale(bounds.width, bounds.height);
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  if (canvas.width === width && canvas.height === height) return false;
  app.setCanvasResolution(RESOLUTION_FIXED, width, height);
  app.renderNextFrame = true;
  return true;
}

function getScrollCameraPosition(progress, reducedMotion) {
  return getScrollCameraPathPose(
    progress,
    CAMERA_START,
    CAMERA_END,
    CAMERA_TARGET,
    reducedMotion,
  ).position;
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

/**
 * Smoothly eases the optical zoom toward its target so wheel notches glide
 * instead of stepping. Pinch input writes the value immediately because the
 * fingers already define the exact zoom the user expects.
 */
function useCameraFov() {
  const [fov, setFov] = useState(CAMERA_FOV);
  const fovRef = useRef(CAMERA_FOV);
  const targetRef = useRef(CAMERA_FOV);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const step = useCallback((time) => {
    frameRef.current = 0;
    const now = Number.isFinite(time) ? time : (window.performance?.now?.() ?? Date.now());
    const dt = clamp((now - lastTimeRef.current) / 1000, 0.001, 0.1);
    lastTimeRef.current = now;
    const target = targetRef.current;
    const current = fovRef.current;
    const alpha = 1 - Math.exp(-dt * FOV_TWEEN_RATE);
    let next = current + (target - current) * alpha;
    if (Math.abs(target - next) < FOV_TWEEN_EPSILON) {
      next = target;
    } else {
      frameRef.current = window.requestAnimationFrame(step);
    }
    fovRef.current = next;
    setFov(next);
  }, []);

  const setTarget = useCallback((value, immediate = false) => {
    if (!Number.isFinite(value)) return;
    const clamped = clamp(value, CAMERA_MIN_FOV, CAMERA_MAX_FOV);
    targetRef.current = clamped;
    if (immediate) {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      fovRef.current = clamped;
      setFov(clamped);
      return;
    }
    if (!frameRef.current) {
      lastTimeRef.current = window.performance?.now?.() ?? Date.now();
      frameRef.current = window.requestAnimationFrame(step);
    }
  }, [step]);

  const adjustTarget = useCallback((delta, immediate = false) => {
    if (!Number.isFinite(delta)) return;
    setTarget(targetRef.current + delta, immediate);
  }, [setTarget]);

  useEffect(() => () => {
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
  }, []);

  return { fov, setTarget, adjustTarget };
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
      syncCanvasResolution(app, canvas);
    };
    const scheduleResize = () => {
      if (!resizeFrame) resizeFrame = window.requestAnimationFrame(resize);
    };
    const resizeObserver = new ResizeObserver(scheduleResize);
    const checkResolution = () => {
      if (document.visibilityState !== "hidden" && (!canvas.width || !canvas.height)) scheduleResize();
    };
    const recoveryTimer = window.setInterval(checkResolution, 1000);

    gsplat.radialSorting = true;
    gsplat.antiAlias = true;
    gsplat.minPixelSize = 0.75;
    gsplat.dataFormat = GSPLATDATA_LARGE;
    if (app.graphicsDevice.isWebGPU) {
      gsplat.minContribution = 2;
    }
    resizeObserver.observe(canvas);
    window.addEventListener("pageshow", scheduleResize);
    window.addEventListener("focus", scheduleResize);
    document.addEventListener("visibilitychange", scheduleResize);
    resize();

    return () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      window.clearInterval(recoveryTimer);
      resizeObserver.disconnect();
      window.removeEventListener("pageshow", scheduleResize);
      window.removeEventListener("focus", scheduleResize);
      document.removeEventListener("visibilitychange", scheduleResize);
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

function DeviceLossGuard({ onDeviceLost, onDeviceRestored }) {
  const app = useApp();

  useEffect(() => {
    const device = app.graphicsDevice;
    if (!device?.on) return undefined;
    const handleLost = () => onDeviceLost();
    const handleRestored = () => {
      app.renderNextFrame = true;
      onDeviceRestored();
    };
    device.on("devicelost", handleLost);
    device.on("devicerestored", handleRestored);
    return () => {
      device.off("devicelost", handleLost);
      device.off("devicerestored", handleRestored);
    };
  }, [app, onDeviceLost, onDeviceRestored]);

  return null;
}

function CameraRig({ apiRef, fov, interactive, manualCameraRef, onCameraReady, progressRef, reducedMotion, settled }) {
  const entityRef = useRef(null);
  const controlsRef = useRef(null);
  const stageRef = useRef({ settled, reducedMotion });
  stageRef.current.settled = settled;
  stageRef.current.reducedMotion = reducedMotion;
  const lastScrollPoseRef = useRef({ progress: Number.NaN, reducedMotion: null });
  const initialPose = useMemo(
    () => ({ position: getScrollCameraPosition(progressRef.current, reducedMotion) }),
    [progressRef, reducedMotion],
  );

  // Re-attaching the active controller at the camera's current pose is the
  // public way to tell CameraControls "this is where the camera is now". It
  // also cancels any damped motion still in flight.
  const syncControls = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls?._camera) return;
    controls.focusPoint = CAMERA_FOCUS;
  }, []);

  const setScrollLocked = useCallback((locked) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const next = Boolean(locked);
    if (controls.scrollLocked === next) return;
    controls.scrollLocked = next;
    if (next) {
      controls.drainInput?.();
      return;
    }
    syncControls();
  }, [syncControls]);

  const placeCamera = useCallback((position, syncToControls) => {
    const entity = entityRef.current;
    if (!entity) return;
    scratchPosition.set(position[0], position[1], position[2]);
    // Derive the orientation exactly like CameraControls does so the orbit
    // takeover never introduces a roll or pitch discontinuity.
    scratchPose.look(scratchPosition, CAMERA_FOCUS);
    entity.setPosition(scratchPose.position);
    entity.setEulerAngles(scratchPose.angles);
    if (syncToControls) syncControls();
  }, [syncControls]);

  // Returns the camera to the pose the current scroll position dictates. Once
  // settled there is no scroll pose to follow, so the orbit camera is left alone.
  const snapToScroll = useCallback(() => {
    const { settled: isSettled, reducedMotion: reduced } = stageRef.current;
    lastScrollPoseRef.current.progress = Number.NaN;
    if (isSettled) return;
    setScrollLocked(true);
    placeCamera(getScrollCameraPosition(progressRef.current, reduced), false);
  }, [placeCamera, progressRef, setScrollLocked]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls?._camera) return undefined;
    controls.pitchRange = CAMERA_PITCH_RANGE;
    controls.yawRange = CAMERA_YAW_RANGE;
    controls.zoomRange = CAMERA_ZOOM_RANGE;
    syncControls();

    const input = controls._desktopInput;
    if (!input) return undefined;
    const originalRead = input.read.bind(input);
    input.read = () => {
      const frame = originalRead();
      const { button } = frame;
      // PlayCanvas treats middle mouse as a pan modifier. With panning disabled
      // that zeroes orbit rotation, so remap a lone middle press to left orbit.
      if (button[1] && !button[0]) {
        button[0] = 1;
        button[1] = 0;
      }
      return frame;
    };

    return () => {
      input.read = originalRead;
    };
  }, [syncControls]);

  useEffect(() => {
    if (!settled) {
      lastScrollPoseRef.current.progress = Number.NaN;
      return;
    }
    if (manualCameraRef.current) {
      setScrollLocked(false);
      return;
    }
    setScrollLocked(false);
    placeCamera(CAMERA_END, true);
  }, [manualCameraRef, placeCamera, setScrollLocked, settled]);

  useEffect(() => {
    if (!entityRef.current) return undefined;
    onCameraReady(entityRef.current);
    return () => onCameraReady(null);
  }, [onCameraReady]);

  useEffect(() => {
    apiRef.current = {
      syncControls,
      snapToScroll,
      setScrollLocked,
      setFloorGestureLocked(locked) {
        const controls = controlsRef.current;
        if (!controls || controls.floorGestureLocked === locked) return;
        controls.floorGestureLocked = locked;
        controls.drainInput();
        syncControls();
      },
      resetView() {
        const { settled: isSettled } = stageRef.current;
        if (!isSettled) {
          snapToScroll();
          return;
        }
        lastScrollPoseRef.current.progress = Number.NaN;
        setScrollLocked(false);
        const controls = controlsRef.current;
        if (controls?.enabled && controls._camera) {
          // Glide back to the settled front view instead of snapping.
          controls.focusDamping = CAMERA_FOCUS_DAMPING;
          controls.reset(CAMERA_FOCUS, scratchPosition.set(...CAMERA_END));
          return;
        }
        placeCamera(CAMERA_END, true);
      },
      focusBlock(blockId) {
        const controls = controlsRef.current;
        if (!controls?._camera) return;
        const pose = getBlockCameraPose(blockId);
        lastScrollPoseRef.current.progress = Number.NaN;
        setScrollLocked(false);
        controls.focusDamping = stageRef.current.reducedMotion ? 0 : BLOCK_FOCUS_DAMPING;
        controls.reset(
          new Vec3(...pose.target),
          scratchPosition.set(...pose.position),
        );
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, placeCamera, setScrollLocked, snapToScroll, syncControls]);

  const handleUpdate = useCallback(() => {
    const { settled: isSettled, reducedMotion: reduced } = stageRef.current;
    const lastScrollPose = lastScrollPoseRef.current;
    const manual = manualCameraRef.current;
    setScrollLocked(!isSettled && !manual);
    if (isSettled) return;
    if (manual) {
      lastScrollPose.progress = Number.NaN;
      return;
    }
    const progress = progressRef.current;
    if (progress === lastScrollPose.progress && reduced === lastScrollPose.reducedMotion) return;
    lastScrollPose.progress = progress;
    lastScrollPose.reducedMotion = reduced;
    // Bind the camera directly to scroll progress. A trailing tween would let
    // WebGL's asynchronous splat sorter display stale intermediate orders.
    placeCamera(getScrollCameraPosition(progress, reduced), false);
  }, [manualCameraRef, placeCamera, progressRef, setScrollLocked]);

  useAppEvent("update", handleUpdate);

  return (
    <Entity ref={entityRef} name="Official Reverance orbit camera" position={initialPose.position}>
      <Camera clearColor="#9aabb7" fov={fov} nearClip={1} farClip={500} />
      <Script
        ref={controlsRef}
        script={ReveranceCameraControls}
        enabled={interactive}
        enableOrbit
        enableFly={false}
        enablePan={false}
        rotateSpeed={0.12}
        zoomSpeed={0}
        moveDamping={0.96}
        rotateDamping={0.9}
        zoomDamping={0.965}
        focusDamping={CAMERA_FOCUS_DAMPING}
      />
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
        return pickBlockFloorFromScreen(cameraEntity, cssX, cssY, rect.width, rect.height);
      },
    };

    return () => {
      if (pickerRef.current?.pick) pickerRef.current = null;
    };
  }, [app, cameraEntityRef, pickerRef]);

  return null;
}

function FloorHighlight({ cameraEntityRef, blockId, floorNumber, splatReady }) {
  const app = useApp();
  const floorNumberRef = useRef(floorNumber);
  floorNumberRef.current = floorNumber;
  const scratchRef = useRef(null);
  if (!scratchRef.current) {
    scratchRef.current = {
      viewProjection: new Mat4(),
      inverseViewProjection: new Mat4(),
      floorFromClip: new Mat4(),
      floorWorldToLocal: new Mat4(),
      worldToClipW: new Float32Array(4),
      pixelToLocalY: new Float32Array(2),
      lastUniforms: new Float64Array(6).fill(Number.NaN),
    };
  }
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
      app.systems?.gsplat?.off("material:created", onMaterialCreated);
      // The Application parent may already have destroyed its scene on route
      // changes or development reloads before passive effect cleanup runs.
      if (!app.scene?.gsplat) return;
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
    const scratch = scratchRef.current;
    scratch.lastUniforms.fill(Number.NaN);
    const material = app.scene.gsplat.material;
    const volume = getFloorVolumesForBlock(blockId).find((candidate) => candidate.number === floorNumber);
    const transform = scratch.floorWorldToLocal;
    if (volume) {
      transform.copy(getHighlightWorldToFloorTransform(volume));
    } else {
      transform.setIdentity();
    }

    material.setParameter("uFloorWorldToLocal", transform.data);
    material.setParameter("uFloorHalfSize", FLOOR_HIGHLIGHT_HALF_SIZE);
    material.setParameter("uFloorHighlightEnabled", volume ? 1 : 0);
    material.setParameter("uFloorWorldToClipW", scratch.worldToClipW);
    material.setParameter("uFloorPixelToLocalY", scratch.pixelToLocalY);
    material.setParameter("uFloorVisualYOffset", volume ? getFloorVisualYOffset(volume.number) : 0);
    material.setParameter("uDistantEnvironmentRadius", DISTANT_ENVIRONMENT_RADIUS);
    // Unified GSplats render with an internal material that only copies the
    // public scene material while it is dirty. setParameter() alone does not
    // mark it dirty, so the scalar enabled flag otherwise stays at its initial
    // zero value even though picking and the tooltip continue to update.
    material.update();
    app.renderNextFrame = true;
  }, [app, blockId, floorNumber]);

  // Runs on `prerender`, after every `update` handler has finished moving the
  // camera, so the slab clip always matches the pose that is about to render.
  const handlePrerender = useCallback(() => {
    if (floorNumberRef.current === null || floorNumberRef.current === undefined) return;
    const camera = cameraEntityRef.current?.camera;
    if (!camera) return;

    const scratch = scratchRef.current;
    const vp = scratch.viewProjection.mul2(camera.projectionMatrix, camera.viewMatrix);
    const invVp = scratch.inverseViewProjection.copy(vp).invert();
    const fromClip = scratch.floorFromClip.mul2(scratch.floorWorldToLocal, invVp);
    const vpData = vp.data;
    const fromClipData = fromClip.data;
    const width = Math.max(1, app.graphicsDevice.width);
    const height = Math.max(1, app.graphicsDevice.height);
    const worldToClipW = scratch.worldToClipW;
    const pixelToLocalY = scratch.pixelToLocalY;
    const last = scratch.lastUniforms;

    const nextPixelToLocalX = (2 * fromClipData[1]) / width;
    const nextPixelToLocalY = (2 * fromClipData[5]) / height;
    if (
      last[0] === vpData[3]
      && last[1] === vpData[7]
      && last[2] === vpData[11]
      && last[3] === vpData[15]
      && last[4] === nextPixelToLocalX
      && last[5] === nextPixelToLocalY
    ) {
      return;
    }
    last[0] = vpData[3];
    last[1] = vpData[7];
    last[2] = vpData[11];
    last[3] = vpData[15];
    last[4] = nextPixelToLocalX;
    last[5] = nextPixelToLocalY;

    worldToClipW[0] = vpData[3];
    worldToClipW[1] = vpData[7];
    worldToClipW[2] = vpData[11];
    worldToClipW[3] = vpData[15];
    pixelToLocalY[0] = nextPixelToLocalX;
    pixelToLocalY[1] = nextPixelToLocalY;

    const material = app.scene.gsplat.material;
    material.setParameter("uFloorWorldToClipW", worldToClipW);
    material.setParameter("uFloorPixelToLocalY", pixelToLocalY);
  }, [app, cameraEntityRef]);

  useAppEvent("prerender", handlePrerender);

  return null;
}

function SplatScene({
  cameraEntityRef,
  cameraRigRef,
  highlightedBlock,
  hoveredFloor,
  hoveredBlock,
  highlightedFloor,
  fov,
  interactive,
  manualCameraRef,
  onCameraReady,
  onDeviceLost,
  onDeviceRestored,
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
        apiRef={cameraRigRef}
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
        cameraEntityRef={cameraEntityRef}
        blockId={interactive ? hoveredBlock ?? highlightedBlock : null}
        floorNumber={interactive ? hoveredFloor ?? highlightedFloor : null}
        splatReady={splatReady}
      />
      <VisibilityGovernor />
      <DeviceLossGuard onDeviceLost={onDeviceLost} onDeviceRestored={onDeviceRestored} />
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
  const { t } = useLanguage();
  const floorsByNumber = new Map(snapshot.floors.map((floor) => [String(floor.number), floor]));
  return (
    <div className="model-static-fallback">
      <img src={snapshot.buildingImage} alt={t("buildingElevationAlt")} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={t("selectFloor")}>
        {snapshot.buildingShapes.map((shape) => {
          const floor = floorsByNumber.get(String(shape.target));
          const summary = getFloorSummary(floor);
          return (
            <polygon
              className={Number(shape.target) === highlightedFloor ? "is-filter-match" : ""}
              key={shape.id}
              tabIndex="0"
              role="button"
              aria-label={t("floorAvailability", { floor: floorName(shape.target, t), count: summary.available })}
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

export function Reverance3D({ snapshot, onSelectFloor, highlightedFloor = null, highlightedBlock = null, settled, interactive = settled, zoomable = interactive, progressRef }) {
  const { t } = useLanguage();
  const [hoveredFloor, setHoveredFloor] = useState(null);
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const blocks = useMemo(() => (
    Array.isArray(snapshot?.blocks) && snapshot.blocks.length
      ? snapshot.blocks
      : [{ id: snapshot?.blockId || "ReveranceA", code: "A", name: snapshot?.blockName || "A Block", floors: snapshot?.floors || [] }]
  ), [snapshot]);
  const [activeBlockId, setActiveBlockId] = useState(() => blocks[0]?.id || "ReveranceA");
  const [hoverPoint, setHoverPoint] = useState(null);
  const [loadState, setLoadState] = useState({ status: "loading", progress: 0, error: null });
  const [deviceLost, setDeviceLost] = useState(false);
  const { fov: cameraFov, setTarget: setFovTarget, adjustTarget: adjustFovTarget } = useCameraFov();
  const cameraEntityRef = useRef(null);
  const cameraRigRef = useRef(null);
  const manualCameraRef = useRef(false);
  const pickerRef = useRef(null);
  const modelRef = useRef(null);
  const pointerStartRef = useRef(null);
  const touchPointersRef = useRef(new Map());
  const pinchDistanceRef = useRef(null);
  const hoverRequestRef = useRef(0);
  const hoverFrameRef = useRef(0);
  const hoverSyncFrameRef = useRef(0);
  const latestHoverRef = useRef(null);
  const lastPointerClientRef = useRef(null);
  const draggedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const railRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const canRenderSplat = typeof window !== "undefined"
    && ("WebGL2RenderingContext" in window || "gpu" in window.navigator);
  useEffect(() => {
    if (highlightedBlock && blocks.some((block) => block.id === highlightedBlock)) setActiveBlockId(highlightedBlock);
    else if (!blocks.some((block) => block.id === activeBlockId)) setActiveBlockId(blocks[0]?.id || "ReveranceA");
  }, [activeBlockId, blocks, highlightedBlock]);
  const activeBlock = blocks.find((block) => block.id === activeBlockId) || blocks[0];
  const orderedFloors = useMemo(
    () => [...(activeBlock?.floors || [])].sort((a, b) => b.number - a.number),
    [activeBlock],
  );
  const hoveredFloorData = useMemo(
    () => activeBlock?.floors?.find((floor) => floor.number === hoveredFloor) || null,
    [activeBlock, hoveredFloor],
  );
  const hoveredFloorSummary = hoveredFloorData ? getFloorSummary(hoveredFloorData) : null;
  const effectiveHighlightedFloor = hoveredFloor ?? highlightedFloor;
  const isReady = loadState.status === "ready" && !deviceLost;

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
  const handleDeviceLost = useCallback(() => setDeviceLost(true), []);
  const handleDeviceRestored = useCallback(() => setDeviceLost(false), []);

  const handleFloorKeyDown = useCallback((event, currentFloor) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectFloor(currentFloor, activeBlock?.id || null);
      return;
    }
    const target = getKeyboardFloorTarget(activeBlock?.floors || [], currentFloor, event.key);
    if (target === currentFloor) return;
    event.preventDefault();
    railRef.current?.querySelector(`[data-floor="${target}"]`)?.focus();
  }, [activeBlock, onSelectFloor]);

  const pickFloorAtPoint = useCallback((canvas, cssX, cssY) => {
    if (!interactive || !isReady || !canvas || !pickerRef.current?.pick) return null;
    const rect = canvas.getBoundingClientRect();
    if (cssX < 0 || cssY < 0 || cssX > rect.width || cssY > rect.height) return null;
    return pickerRef.current.pick(cssX, cssY);
  }, [interactive, isReady]);

  const clearHover = useCallback(() => {
    setHoveredFloor(null);
    setHoveredBlock(null);
    setHoverPoint(null);
  }, []);

  const invalidateHoverPick = useCallback(() => {
    hoverRequestRef.current += 1;
    latestHoverRef.current = null;
    if (hoverFrameRef.current) {
      window.cancelAnimationFrame(hoverFrameRef.current);
      hoverFrameRef.current = 0;
    }
  }, []);

  // Coalesce pointer moves into one pick per animation frame.
  const scheduleHoverPick = useCallback((payload) => {
    latestHoverRef.current = payload;
    if (hoverFrameRef.current) return;
    hoverFrameRef.current = window.requestAnimationFrame(() => {
      hoverFrameRef.current = 0;
      const next = latestHoverRef.current;
      latestHoverRef.current = null;
      if (!next || next.request !== hoverRequestRef.current) return;
      const selection = pickFloorAtPoint(next.canvas, next.x, next.y);
      if (
        selection?.blockId
        && manualCameraRef.current
        && selection.blockId !== activeBlock?.id
      ) {
        setHoveredFloor(null);
        setHoveredBlock(null);
        setHoverPoint(null);
        return;
      }
      setHoveredFloor(selection?.floor ?? null);
      setHoveredBlock(selection?.blockId ?? null);
      if (!selection) {
        setHoverPoint(null);
        return;
      }
      if (selection.blockId && !manualCameraRef.current) setActiveBlockId(selection.blockId);
      setHoverPoint(getFloorTooltipPosition(next.pointer, next.tooltipSize));
    });
  }, [activeBlock, pickFloorAtPoint]);

  const syncHoverToPointer = useCallback(() => {
    const pointer = lastPointerClientRef.current;
    if (!interactive) {
      clearHover();
      return;
    }
    if (!pointer) {
      clearHover();
      return;
    }

    const pointerTarget = document.elementFromPoint(pointer.x, pointer.y);
    const railButton = pointerTarget?.closest?.(".model-floor-rail button[data-floor]");
    if (railButton?.dataset.floor) {
      invalidateHoverPick();
      setHoveredFloor(Number(railButton.dataset.floor));
      setHoveredBlock(activeBlock?.id || null);
      setHoverPoint(null);
      return;
    }

    const model = modelRef.current;
    const canvas = model?.querySelector("canvas");
    if (!canvas || pointerTarget !== canvas) {
      invalidateHoverPick();
      clearHover();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (pointer.x < rect.left || pointer.y < rect.top || pointer.x > rect.right || pointer.y > rect.bottom) {
      invalidateHoverPick();
      clearHover();
      return;
    }

    const localPointer = { x: pointer.x - rect.left, y: pointer.y - rect.top };
    const request = ++hoverRequestRef.current;
    scheduleHoverPick({
      canvas,
      x: localPointer.x,
      y: localPointer.y,
      pointer: localPointer,
      request,
      tooltipSize: { width: rect.width, height: rect.height },
    });
  }, [activeBlock, clearHover, interactive, invalidateHoverPick, scheduleHoverPick]);

  const scheduleHoverSync = useCallback(() => {
    if (hoverSyncFrameRef.current) return;
    hoverSyncFrameRef.current = window.requestAnimationFrame(() => {
      hoverSyncFrameRef.current = 0;
      syncHoverToPointer();
    });
  }, [syncHoverToPointer]);

  useEffect(() => {
    if (interactive) return;
    manualCameraRef.current = false;
    setFovTarget(CAMERA_FOV, true);
    invalidateHoverPick();
    clearHover();
  }, [clearHover, interactive, invalidateHoverPick, setFovTarget]);

  useEffect(() => () => invalidateHoverPick(), [invalidateHoverPick]);

  const handleOpticalZoom = useCallback((delta, immediate = false) => {
    if (!zoomable) return;
    adjustFovTarget(delta, immediate);
  }, [adjustFovTarget, zoomable]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return undefined;

    const handleWheel = (event) => {
      const onMap = event.target?.closest?.(".building-map");
      if (!onMap) return;

      if (zoomable && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.stopPropagation();
        handleOpticalZoom(normalizeWheelDelta(event).deltaY * WHEEL_ZOOM_DEGREES_PER_PIXEL);
        scheduleHoverSync();
        return;
      }

      // Floor rail, reset button and other controls keep native wheel behaviour.
      if (!event.target?.closest?.("canvas")) return;

      // PlayCanvas' input source calls preventDefault on every canvas wheel
      // event. Stop it in the capture phase so the browser keeps its native page
      // scroll, momentum and direction handling.
      event.stopPropagation();
      scheduleHoverSync();
    };

    model.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => model.removeEventListener("wheel", handleWheel, { capture: true });
  }, [handleOpticalZoom, scheduleHoverSync, zoomable]);

  useEffect(() => {
    if (!interactive) return undefined;
    const handleScroll = () => scheduleHoverSync();
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [interactive, scheduleHoverSync]);

  useEffect(() => () => {
    if (hoverSyncFrameRef.current) {
      window.cancelAnimationFrame(hoverSyncFrameRef.current);
      hoverSyncFrameRef.current = 0;
    }
  }, []);

  const handleModelPointerDown = useCallback((event) => {
    if (!interactive || !event.target.closest?.("canvas")) return;
    if (event.pointerType === "touch") {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size >= 2) {
        const [first, second] = [...touchPointersRef.current.values()];
        pinchDistanceRef.current = Math.hypot(second.x - first.x, second.y - first.y);
        draggedRef.current = true;
        suppressClickRef.current = true;
        if (pointerStartRef.current) pointerStartRef.current.mode = "pinch";
        cameraRigRef.current?.setFloorGestureLocked(true);
        invalidateHoverPick();
        clearHover();
        return;
      }
    }
    const canvas = event.currentTarget.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    const selection = event.pointerType === "touch" && rect
      ? pickFloorAtPoint(canvas, event.clientX - rect.left, event.clientY - rect.top)
      : null;
    if (event.button === 1) {
      event.preventDefault();
      manualCameraRef.current = true;
      cameraRigRef.current?.setScrollLocked(false);
    }
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      manualBefore: manualCameraRef.current,
      mode: selection ? "floor" : "orbit",
    };
    draggedRef.current = false;
    suppressClickRef.current = false;
    // Grabbing the model stops any damped motion still in flight. A selected
    // block already owns the orbit target; syncing it to the scroll camera at
    // this point would silently move the target back to block A.
    if (!manualCameraRef.current) cameraRigRef.current?.syncControls();
    if (selection) {
      cameraRigRef.current?.setFloorGestureLocked(true);
      invalidateHoverPick();
      setHoveredFloor(selection.floor);
      setHoveredBlock(selection.blockId);
      setActiveBlockId(selection.blockId);
      setHoverPoint(getFloorTooltipPosition(
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        { width: rect.width, height: rect.height },
      ));
    }
  }, [clearHover, interactive, invalidateHoverPick, pickFloorAtPoint]);

  const handleModelPointerMove = useCallback((event) => {
    if (!interactive) return;
    lastPointerClientRef.current = { x: event.clientX, y: event.clientY };
    if ((event.buttons & 4) === 4) {
      manualCameraRef.current = true;
      cameraRigRef.current?.setScrollLocked(false);
    }
    if (event.pointerType === "touch" && touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size === 2) {
        const [first, second] = [...touchPointersRef.current.values()];
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        if (pinchDistanceRef.current && distance > 0) {
          manualCameraRef.current = true;
          cameraRigRef.current?.setScrollLocked(false);
          handleOpticalZoom(
            Math.log(pinchDistanceRef.current / distance) * PINCH_ZOOM_DEGREES_PER_LOG_UNIT,
            true,
          );
        }
        pinchDistanceRef.current = distance;
        invalidateHoverPick();
        clearHover();
        return;
      }
    }
    const pointerStart = pointerStartRef.current;
    if (pointerStart?.mode === "pinch") return;
    if (pointerStart && (event.buttons > 0 || event.pointerType === "touch")) {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > DRAG_THRESHOLD_PX) {
        draggedRef.current = true;
        if (pointerStart.mode === "orbit") {
          manualCameraRef.current = true;
          cameraRigRef.current?.setScrollLocked(false);
        }
      }
      if (pointerStart.mode !== "floor") {
        invalidateHoverPick();
        clearHover();
        return;
      }
    }
    if (event.pointerType === "touch" && pointerStart?.mode !== "floor") {
      invalidateHoverPick();
      clearHover();
      return;
    }
    if (draggedRef.current && pointerStart?.mode !== "floor") return;
    if (!event.target.closest?.("canvas")) {
      invalidateHoverPick();
      if (!event.target.closest?.(".model-floor-rail button")) clearHover();
      return;
    }
    const canvas = event.currentTarget.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return;
    const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const request = ++hoverRequestRef.current;
    scheduleHoverPick({
      canvas,
      x: pointer.x,
      y: pointer.y,
      pointer,
      request,
      tooltipSize: { width: rect.width, height: rect.height },
    });
  }, [clearHover, handleOpticalZoom, interactive, invalidateHoverPick, scheduleHoverPick]);

  const handleModelPointerUp = useCallback((event) => {
    touchPointersRef.current.delete(event.pointerId);
    pinchDistanceRef.current = null;
    if (touchPointersRef.current.size) return;
    cameraRigRef.current?.setFloorGestureLocked(false);
    const dragged = draggedRef.current;
    const hadPointerStart = pointerStartRef.current !== null;
    suppressClickRef.current = dragged;
    pointerStartRef.current = null;
    draggedRef.current = false;
    if (event.pointerType === "touch") {
      lastPointerClientRef.current = null;
      invalidateHoverPick();
      if (dragged) clearHover();
    }
    // A click without a drag must leave the scroll-bound camera untouched, so
    // undo the sub-threshold orbit nudge CameraControls already applied.
    if (hadPointerStart && !dragged && !manualCameraRef.current) {
      cameraRigRef.current?.snapToScroll();
    }
  }, [clearHover, invalidateHoverPick]);

  // The browser cancels the pointer when it claims a touch as a page scroll.
  // Any pointer moves that slipped through before that were a swipe, not an
  // orbit, so hand the camera back to the scroll binding.
  const handleModelPointerCancel = useCallback((event) => {
    touchPointersRef.current.delete(event.pointerId);
    pinchDistanceRef.current = null;
    const pointerStart = pointerStartRef.current;
    pointerStartRef.current = null;
    draggedRef.current = false;
    suppressClickRef.current = false;
    cameraRigRef.current?.setFloorGestureLocked(false);
    lastPointerClientRef.current = null;
    if (pointerStart && !pointerStart.manualBefore) {
      manualCameraRef.current = false;
      cameraRigRef.current?.snapToScroll();
    }
    invalidateHoverPick();
    clearHover();
  }, [clearHover, invalidateHoverPick]);

  const handleModelPointerLeave = useCallback(() => {
    lastPointerClientRef.current = null;
    touchPointersRef.current.clear();
    pinchDistanceRef.current = null;
    pointerStartRef.current = null;
    draggedRef.current = false;
    suppressClickRef.current = false;
    cameraRigRef.current?.setFloorGestureLocked(false);
    invalidateHoverPick();
    clearHover();
  }, [clearHover, invalidateHoverPick]);

  const handleModelClick = useCallback((event) => {
    if (!interactive) return;
    const dragged = draggedRef.current || suppressClickRef.current;
    pointerStartRef.current = null;
    draggedRef.current = false;
    suppressClickRef.current = false;
    if (!event.target.closest?.("canvas")) return;
    if (dragged) return;
    const canvas = event.currentTarget.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const floorPick = pickFloorAtPoint(
      canvas,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
    if (!floorPick) return;
    invalidateHoverPick();
    setHoverPoint(null);
    setHoveredFloor(floorPick.floor);
    setHoveredBlock(floorPick.blockId);
    setActiveBlockId(floorPick.blockId);
    onSelectFloor(floorPick.floor, floorPick.blockId);
  }, [interactive, invalidateHoverPick, onSelectFloor, pickFloorAtPoint]);

  const handleResetView = useCallback((event) => {
    event.stopPropagation();
    pointerStartRef.current = null;
    draggedRef.current = false;
    suppressClickRef.current = false;
    cameraRigRef.current?.setFloorGestureLocked(false);
    invalidateHoverPick();
    clearHover();
    setFovTarget(CAMERA_FOV);
    manualCameraRef.current = false;
    cameraRigRef.current?.resetView();
  }, [clearHover, invalidateHoverPick, setFovTarget]);

  const handleBlockSelect = useCallback((blockId) => {
    invalidateHoverPick();
    lastPointerClientRef.current = null;
    setActiveBlockId(blockId);
    setHoveredFloor(null);
    setHoveredBlock(null);
    setHoverPoint(null);
    if (interactive) {
      manualCameraRef.current = true;
      cameraRigRef.current?.focusBlock(blockId);
    }
  }, [interactive, invalidateHoverPick]);

  const fallback = <StaticFallback snapshot={snapshot} highlightedFloor={effectiveHighlightedFloor} onSelectFloor={onSelectFloor} />;

  return (
    <div
      ref={modelRef}
      className={`building-map building-model building-splat ${settled ? "is-settled" : "is-turning"} ${interactive ? "is-interactive" : ""}`}
      data-load-state={deviceLost ? "restoring" : loadState.status}
      data-camera-fov={cameraFov.toFixed(3)}
      data-hovered-floor={hoveredFloor ?? undefined}
      data-hovered-block={hoveredBlock ?? undefined}
      data-filtered-floor={highlightedFloor ?? undefined}
      data-filtered-block={highlightedBlock ?? undefined}
      aria-busy={loadState.status === "loading" || deviceLost}
      onPointerDownCapture={handleModelPointerDown}
      onPointerMove={handleModelPointerMove}
      onPointerUp={handleModelPointerUp}
      onPointerCancel={handleModelPointerCancel}
      onPointerLeave={handleModelPointerLeave}
      onClick={handleModelClick}
      onAuxClick={(event) => {
        if (event.button === 1) event.preventDefault();
      }}
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
              cameraRigRef={cameraRigRef}
              fov={cameraFov}
              highlightedBlock={highlightedBlock}
              highlightedFloor={highlightedFloor}
              interactive={interactive}
              manualCameraRef={manualCameraRef}
              hoveredFloor={hoveredFloor}
              onCameraReady={handleCameraReady}
              onDeviceLost={handleDeviceLost}
              onDeviceRestored={handleDeviceRestored}
              onStateChange={reportState}
              pickerRef={pickerRef}
              progressRef={progressRef}
              reducedMotion={reducedMotion}
              settled={settled}
              splatReady={loadState.status === "ready"}
              hoveredBlock={hoveredBlock}
            />
          </Application>
        </WebGLErrorBoundary>
      ) : fallback}

      {canRenderSplat && loadState.status === "loading" && (
        <div className="model-loading model-loading-splat" role="status" aria-live="polite">
          <span />{t("reconstructingView")} · {Math.round(loadState.progress * 100)}%
        </div>
      )}
      {canRenderSplat && loadState.status === "ready" && deviceLost && (
        <div className="model-loading model-loading-splat" role="status" aria-live="polite">
          <span />{t("restoringView")}
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
            {t("resetView")}
          </button>
          {blocks.length > 1 && (
            <div className="model-block-switcher" aria-label={t("selectBuildingBlock")}>
              {blocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  className={activeBlock?.id === block.id ? "is-active" : ""}
                  aria-pressed={activeBlock?.id === block.id}
                  onClick={() => handleBlockSelect(block.id)}
                >
                  {block.code || block.name}
                </button>
              ))}
            </div>
          )}
          <div ref={railRef} className={`model-floor-rail ${interactive ? "is-visible" : ""}`} aria-label={t("selectBuildingFloor")}>
            {orderedFloors.map((floor) => {
              const summary = getFloorSummary(floor);
              return (
                <button
                  key={floor.number}
                  type="button"
                  data-floor={floor.number}
                  className={`${hoveredFloor === floor.number && (!hoveredBlock || hoveredBlock === activeBlock?.id) ? "is-active" : ""} ${hoveredFloor === null && highlightedFloor === floor.number && (!highlightedBlock || highlightedBlock === activeBlock?.id) ? "is-filter-match" : ""}`}
                  tabIndex={interactive ? 0 : -1}
                  aria-label={t("floorAvailability", { floor: floorName(floor.number, t), count: summary.available })}
                  onMouseEnter={() => {
                    invalidateHoverPick();
                    setHoveredFloor(floor.number);
                    setHoveredBlock(activeBlock?.id || null);
                    setHoverPoint(null);
                  }}
                  onMouseLeave={() => { setHoveredFloor(null); setHoveredBlock(null); }}
                  onFocus={() => {
                    invalidateHoverPick();
                    setHoveredFloor(floor.number);
                    setHoveredBlock(activeBlock?.id || null);
                    setHoverPoint(null);
                  }}
                  onBlur={() => { setHoveredFloor(null); setHoveredBlock(null); }}
                  onKeyDown={(event) => handleFloorKeyDown(event, floor.number)}
                  onClick={() => onSelectFloor(floor.number, activeBlock?.id || null)}
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
              <span>{t("floor")}</span>
              <small>{hoveredFloorSummary.available} {t("available")}</small>
            </div>
          )}
          <span className="model-floor-status" role="status" aria-live="polite" aria-atomic="true">
            {hoveredFloorSummary
              ? t("floorHighlighted", { floor: floorName(hoveredFloor, t), count: hoveredFloorSummary.available })
              : ""}
          </span>
        </>
      )}

      <div className="building-model-instruction" aria-live="polite">
        <span className="model-instruction-index">{t(settled ? "live3D" : interactive ? "interactive" : "scroll")}</span>
        <strong>
          {interactive ? (
            <>
              <span className="model-instruction-desktop">
                {t(settled ? "desktopModelInstructions" : "desktopScrollInstructions")}
              </span>
              <span className="model-instruction-mobile">
                {t(settled ? "mobileModelInstructions" : "mobileScrollInstructions")}
              </span>
            </>
          ) : t("turningBuilding")}
        </strong>
      </div>
      <span className="building-model-badge" aria-hidden="true">
        <span className="model-badge-desktop">{t("officialReconstruction", { block: activeBlock?.code || "A" })}</span>
        <span className="model-badge-mobile">{activeBlock?.name || t("projectReveranceBlock")}</span>
      </span>
    </div>
  );
}
