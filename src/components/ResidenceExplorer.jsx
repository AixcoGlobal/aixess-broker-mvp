import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  CheckCircle,
  HouseLine,
  X,
} from "@phosphor-icons/react";
import {
  getFloorSummary,
  getStatusLabel,
  loadLiveFloor,
  loadResidenceSnapshot,
  mergeFloorUnits,
  normalizeStatus,
} from "../data/reveranceApi";
import "./ResidenceExplorer.css";

const Reverance3D = lazy(() => import("./Reverance3D").then((module) => ({
  default: module.Reverance3D,
})));

function pointsToString(points) {
  return (points || []).map((point) => `${point.x},${point.y}`).join(" ");
}

function floorLabel(number) {
  return `Floor ${String(number).padStart(2, "0")}`;
}

function unitSort(a, b) {
  return String(a.name).localeCompare(String(b.name), undefined, { numeric: true });
}

function getUnitSlots(floor, units) {
  const unitsByName = new Map(units.map((unit) => [String(unit.name), unit]));
  const slots = floor.shapes.map((shape) => ({
    shape,
    unit: unitsByName.get(String(shape.target)) || {
      id: `sold-${shape.target}`,
      name: String(shape.target),
      status: "sold",
      floor: floor.number,
      rooms: 0,
      bedrooms: 0,
      totalArea: 0,
      areas: [],
      image2d: null,
      image3d: null,
      price: null,
    },
  }));

  const mappedNames = new Set(slots.map(({ unit }) => String(unit.name)));
  for (const unit of units) {
    if (!mappedNames.has(String(unit.name))) slots.push({ shape: null, unit });
  }

  return slots.sort((a, b) => unitSort(a.unit, b.unit));
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function useScrollStage(sectionRef) {
  const [settled, setSettled] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const progressRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const render = () => {
      frame = 0;
      const height = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = reducedMotion.matches
        ? 1
        : clamp(-section.getBoundingClientRect().top / height);
      const isSettled = reducedMotion.matches || progress >= 0.965;
      const bounds = section.getBoundingClientRect();
      const isInteractive = reducedMotion.matches
        || (bounds.top < window.innerHeight && bounds.bottom > 0);

      progressRef.current = progress;
      section.style.setProperty("--explorer-progress", progress.toFixed(4));
      section.style.setProperty("--copy-shift", `${(-progress * 1.5).toFixed(3)}rem`);
      setSettled((current) => (current === isSettled ? current : isSettled));
      setInteractive((current) => (current === isInteractive ? current : isInteractive));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener?.("change", schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener?.("change", schedule);
    };
  }, [sectionRef]);

  return { interactive, settled, progressRef };
}

function useDialogA11y(open, onClose, dialogRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    document.body.classList.add("modal-open");

    const focusableSelector = [
      "button:not([disabled])",
      "select:not([disabled])",
      "a[href]",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll(focusableSelector) || [])]
        .filter((element) => !element.hasAttribute("hidden") && element.offsetParent !== null);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector("[data-autofocus]")?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [dialogRef, open]);
}

function AvailabilityLegend({ dark = false }) {
  return (
    <div className={`availability-legend ${dark ? "is-dark" : ""}`} aria-label="Residence status legend">
      <span><i className="status-swatch is-available" />Available</span>
      <span><i className="status-swatch is-reserved" />Reserved</span>
      <span><i className="status-swatch is-sold" />Sold</span>
    </div>
  );
}

function UnitDetail({ unit, imageMode, setImageMode, onBrokerAccess }) {
  const [imageFailed, setImageFailed] = useState(false);
  const previewSource = imageMode === "3d" ? unit.image3d : unit.image2d;

  useEffect(() => setImageFailed(false), [previewSource]);

  return (
    <section className="unit-detail" aria-labelledby="selected-unit-title">
      <div className="unit-detail-heading">
        <div>
          <p className={`unit-status is-${normalizeStatus(unit.status)}`}>
            <span />{getStatusLabel(unit.status)}
          </p>
          <h3 id="selected-unit-title">Residence {unit.name}</h3>
        </div>
        <strong>{unit.totalArea ? `${unit.totalArea.toFixed(1)} m²` : "—"}</strong>
      </div>

      <dl className="unit-facts">
        <div><dt>Floor</dt><dd>{unit.floor || "—"}</dd></div>
        <div><dt>Rooms</dt><dd>{unit.rooms || "—"}</dd></div>
        <div><dt>Bedrooms</dt><dd>{unit.bedrooms || "—"}</dd></div>
        <div><dt>Price</dt><dd>{unit.price ? String(unit.price) : "On request"}</dd></div>
      </dl>

      {(unit.image2d || unit.image3d) && (
        <div className="unit-preview-wrap">
          <div className="unit-preview-tabs" aria-label="Residence image view">
            <button className={imageMode === "2d" ? "is-active" : ""} type="button" onClick={() => setImageMode("2d")} disabled={!unit.image2d}>2D PLAN</button>
            <button className={imageMode === "3d" ? "is-active" : ""} type="button" onClick={() => setImageMode("3d")} disabled={!unit.image3d}>3D VIEW</button>
          </div>
          {previewSource && !imageFailed ? (
            <img className="unit-preview" src={previewSource} alt={`${imageMode.toUpperCase()} view of residence ${unit.name}`} onError={() => setImageFailed(true)} />
          ) : (
            <div className="unit-preview-fallback">Preview temporarily unavailable</div>
          )}
        </div>
      )}

      {unit.areas.length > 0 && (
        <div className="unit-area-list">
          {unit.areas.map((area) => (
            <span key={area.id}><b>{area.label}</b>{area.size.toFixed(1)} m²</span>
          ))}
        </div>
      )}

      <button className="button button-primary unit-enquiry" type="button" onClick={onBrokerAccess} disabled={normalizeStatus(unit.status) !== "available"}>
        {normalizeStatus(unit.status) === "available" ? "REQUEST THIS RESIDENCE" : `${getStatusLabel(unit.status).toUpperCase()} RESIDENCE`}
      </button>
    </section>
  );
}

function FloorModal({ snapshot, floorNumber, onClose, onChangeFloor, onBrokerAccess, floorLoader }) {
  const dialogRef = useRef(null);
  const requestId = useRef(0);
  const floor = snapshot.floors.find((item) => item.number === floorNumber);
  const [units, setUnits] = useState(floor?.units || []);
  const [selectedUnitName, setSelectedUnitName] = useState(null);
  const [filter, setFilter] = useState("all");
  const [imageMode, setImageMode] = useState("2d");
  const [syncState, setSyncState] = useState("refreshing");

  useDialogA11y(true, onClose, dialogRef);

  useEffect(() => {
    if (!floor) return undefined;
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setUnits(floor.units || []);
    setSelectedUnitName(null);
    setFilter("all");
    setImageMode("2d");
    setSyncState("refreshing");

    floorLoader(snapshot.blockId, floor.number)
      .then((liveUnits) => {
        if (requestId.current !== currentRequest) return;
        setUnits(mergeFloorUnits(floor.units, liveUnits));
        setSyncState("live");
      })
      .catch(() => {
        if (requestId.current !== currentRequest) return;
        setSyncState("snapshot");
      });

    return () => {
      if (requestId.current === currentRequest) requestId.current += 1;
    };
  }, [floor, floorLoader, snapshot.blockId]);

  const slots = useMemo(() => (floor ? getUnitSlots(floor, units) : []), [floor, units]);
  const selectedSlot = slots.find(({ unit }) => String(unit.name) === String(selectedUnitName));
  const selectedUnit = selectedSlot?.unit || null;
  const visibleSlots = filter === "all"
    ? slots
    : slots.filter(({ unit }) => normalizeStatus(unit.status) === filter);
  const currentIndex = snapshot.floors.findIndex((item) => item.number === floorNumber);
  const previousFloor = snapshot.floors[currentIndex - 1];
  const nextFloor = snapshot.floors[currentIndex + 1];

  const selectUnit = useCallback((unit) => {
    setSelectedUnitName(String(unit.name));
    setImageMode(unit.image2d ? "2d" : "3d");
  }, []);

  if (!floor) return null;

  return (
    <div className="floor-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="floor-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="floor-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="floor-modal-header">
          <div>
            <p>PROJECT REVERANCE · A BLOCK</p>
            <h2 id="floor-modal-title">{floorLabel(floor.number)}</h2>
          </div>
          <div className="floor-navigation">
            <button type="button" onClick={() => previousFloor && onChangeFloor(previousFloor.number)} disabled={!previousFloor} aria-label="Previous floor">
              <ArrowLeft aria-hidden="true" />
            </button>
            <select value={floor.number} onChange={(event) => onChangeFloor(Number(event.target.value))} aria-label="Select floor">
              {snapshot.floors.map((item) => <option key={item.number} value={item.number}>{floorLabel(item.number)}</option>)}
            </select>
            <button type="button" onClick={() => nextFloor && onChangeFloor(nextFloor.number)} disabled={!nextFloor} aria-label="Next floor">
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
          <button className="floor-modal-close" data-autofocus type="button" onClick={onClose} aria-label="Close residence explorer">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="floor-modal-content">
          <section className="floor-plan-pane" aria-label={`${floorLabel(floor.number)} plan`}>
            <div className="floor-plan-stage">
              <img src={floor.planImage} alt={`Architectural plan for ${floorLabel(floor.number)}`} />
              <svg className="unit-hotspots" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Select a residence">
                {slots.filter(({ shape }) => shape).map(({ shape, unit }) => {
                  const status = normalizeStatus(unit.status);
                  const active = selectedUnit && String(selectedUnit.name) === String(unit.name);
                  return (
                    <g
                      className={`unit-hotspot is-${status} ${active ? "is-active" : ""}`}
                      key={shape.id}
                      role="button"
                      tabIndex="0"
                      aria-label={`Residence ${unit.name}, ${getStatusLabel(status)}${unit.totalArea ? `, ${unit.totalArea} square metres` : ""}`}
                      onClick={() => selectUnit(unit)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectUnit(unit);
                        }
                      }}
                    >
                      <polygon points={pointsToString(shape.points)} />
                      <title>Residence {unit.name} · {getStatusLabel(status)}</title>
                    </g>
                  );
                })}
              </svg>
              {!selectedUnit && (
                <div className="floor-plan-prompt"><HouseLine aria-hidden="true" />Select a residence on the plan</div>
              )}
            </div>
            <div className="floor-plan-footer">
              <AvailabilityLegend dark />
              <span className={`sync-state is-${syncState}`}>
                <CheckCircle weight="fill" aria-hidden="true" />
                {syncState === "refreshing" ? "Checking live availability" : syncState === "live" ? "Live availability" : "Verified snapshot"}
              </span>
            </div>
          </section>

          <aside className="inventory-pane" aria-label="Floor residences">
            <div className="inventory-heading">
              <div><p>RESIDENCES</p><strong>{slots.length}</strong></div>
              <div className="inventory-filters" aria-label="Filter residences">
                {[
                  ["all", "All"],
                  ["available", "Available"],
                  ["reserved", "Reserved"],
                ].map(([value, label]) => (
                  <button className={filter === value ? "is-active" : ""} key={value} type="button" onClick={() => setFilter(value)}>{label}</button>
                ))}
              </div>
            </div>

            {selectedUnit ? (
              <UnitDetail unit={selectedUnit} imageMode={imageMode} setImageMode={setImageMode} onBrokerAccess={onBrokerAccess} />
            ) : (
              <div className="inventory-intro">
                <Buildings aria-hidden="true" />
                <h3>Choose a residence.</h3>
                <p>Select a highlighted apartment on the floor plan or use the inventory list below.</p>
              </div>
            )}

            <div className="unit-list" aria-live="polite">
              {visibleSlots.length ? visibleSlots.map(({ unit }) => {
                const status = normalizeStatus(unit.status);
                const active = selectedUnit && String(selectedUnit.name) === String(unit.name);
                return (
                  <button className={`unit-row ${active ? "is-active" : ""}`} type="button" key={unit.id} onClick={() => selectUnit(unit)}>
                    <span><i className={`status-swatch is-${status}`} />#{unit.name}</span>
                    <span>{unit.totalArea ? `${unit.totalArea.toFixed(1)} m²` : "—"}</span>
                    <span>{getStatusLabel(status)}</span>
                    <ArrowRight aria-hidden="true" />
                  </button>
                );
              }) : (
                <p className="inventory-empty">No residences match this filter.</p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export function ResidenceExplorer({ onBrokerAccess, snapshotLoader = loadResidenceSnapshot, floorLoader = loadLiveFloor }) {
  const sectionRef = useRef(null);
  const modelHostRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [canMountModel, setCanMountModel] = useState(() => (
    typeof window === "undefined" || !("IntersectionObserver" in window)
  ));
  const { interactive, settled, progressRef } = useScrollStage(sectionRef);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    snapshotLoader()
      .then((data) => active && setSnapshot(data))
      .catch((error) => active && setLoadError(error));
    return () => { active = false; };
  }, [retryKey, snapshotLoader]);

  useEffect(() => {
    if (canMountModel || !modelHostRef.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setCanMountModel(true);
      observer.disconnect();
    }, { rootMargin: "160px 0px" });

    observer.observe(modelHostRef.current);
    return () => observer.disconnect();
  }, [canMountModel]);

  const summary = useMemo(() => {
    if (!snapshot) return { available: 0, total: 0 };
    return snapshot.floors.reduce((totals, floor) => {
      const floorSummary = getFloorSummary(floor);
      totals.available += floorSummary.available;
      totals.total += floorSummary.total;
      return totals;
    }, { available: 0, total: 0 });
  }, [snapshot]);

  return (
    <section
      className="residence-explorer"
      id="residences"
      ref={sectionRef}
      data-settled={settled}
      data-interactive={interactive}
      aria-labelledby="residence-explorer-title"
    >
      <div className="explorer-sticky">
        <div className="explorer-progress" aria-hidden="true"><span /></div>

        <div className="explorer-copy">
          <p className="section-eyebrow">RESIDENCE EXPLORER</p>
          <h2 id="residence-explorer-title">SELECT THE<br />OPPORTUNITY.</h2>
          <p className="explorer-description">
            Move from elevation to floor plan to individual residence—with live availability built for faster broker decisions.
          </p>

          <div className="explorer-metrics" aria-label="Residence availability summary">
            <div><strong>{summary.available}</strong><span>AVAILABLE<br />RESIDENCES</span></div>
            <div><strong>15</strong><span>SELECTABLE<br />FLOORS</span></div>
          </div>
          <AvailabilityLegend />
          <p className="explorer-footnote">A BLOCK · FLOORS 02–16 · BATUMI</p>
        </div>

        <div className="explorer-stage">
          <div className="explorer-model-host" ref={modelHostRef}>
            {snapshot ? canMountModel ? (
              <Suspense fallback={<div className="explorer-loading" role="status"><span />Preparing the interactive building…</div>}>
                <Reverance3D
                  snapshot={snapshot}
                  onSelectFloor={setSelectedFloor}
                  interactive={interactive}
                  settled={settled}
                  progressRef={progressRef}
                />
              </Suspense>
            ) : (
              <div className="explorer-loading" role="status"><span />Preparing the interactive building…</div>
            ) : loadError ? (
              <div className="explorer-error" role="alert">
                <Buildings aria-hidden="true" />
                <h3>Residence explorer unavailable.</h3>
                <p>The project data could not be loaded. Try again without leaving the page.</p>
                <button className="button button-primary" type="button" onClick={() => setRetryKey((key) => key + 1)}>TRY AGAIN</button>
              </div>
            ) : (
              <div className="explorer-loading" role="status"><span />Loading the residence explorer…</div>
            )}
          </div>
        </div>

        <div className="explorer-motion-caption" aria-hidden="true">
          <span>01 · SIDE PROFILE</span>
          <span>02 · LIVE 3D ROTATION</span>
          <span>03 · EXPLORE FLOOR</span>
        </div>
      </div>

      {snapshot && selectedFloor !== null && (
        <FloorModal
          snapshot={snapshot}
          floorNumber={selectedFloor}
          onClose={() => setSelectedFloor(null)}
          onChangeFloor={setSelectedFloor}
          onBrokerAccess={() => {
            setSelectedFloor(null);
            onBrokerAccess();
          }}
          floorLoader={floorLoader}
        />
      )}
    </section>
  );
}
