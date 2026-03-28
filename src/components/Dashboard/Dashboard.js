import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConveyorBelt from '../ConveyorBelt/ConveyorBelt';
import TrafficLight from '../TrafficLight/TrafficLight';
import Sensor from '../Sensor/Sensor';
import './Dashboard.css';

const SENSOR_POSITION  = 70;    // % position that triggers sensor
const SENSOR2_POSITION = 40;    // % second sensor (entry check)
const PAUSE_DURATION   = 1500;  // ms item pauses at sensor
const TICK_MS          = 50;    // simulation tick interval
const JAM_THRESHOLD    = 4000;  // ms before jam is declared
const MAX_LOG          = 8;     // max fault log entries

function makeItems() {
  return [
    { id: 1, position:  5, paused: false, pausedAt: null, hasPassedSensor: false, noTransition: false },
    { id: 2, position: 40, paused: false, pausedAt: null, hasPassedSensor: false, noTransition: false },
    { id: 3, position: 75, paused: false, pausedAt: null, hasPassedSensor: true,  noTransition: false },
  ];
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

function timestamp() {
  return new Date().toLocaleTimeString('de-DE', { hour12: false });
}

export default function Dashboard() {
  const [items,          setItems]          = useState(makeItems());
  const [isRunning,      setIsRunning]      = useState(false);
  const [hasEverStarted, setHasEverStarted] = useState(false);
  const [isEstop,        setIsEstop]        = useState(false);
  const [speed,          setSpeed]          = useState(0.8);
  const [pieceCount,     setPieceCount]     = useState(0);
  const [faultLog,       setFaultLog]       = useState([]);
  const [runtimeMs,      setRuntimeMs]      = useState(0);
  const [estopBlink,     setEstopBlink]     = useState(false);

  const speedRef       = useRef(speed);
  const runtimeRef     = useRef(null);
  const jamTimerRef    = useRef({});   // itemId → pausedAt timestamp

  useEffect(() => { speedRef.current = speed; }, [speed]);

  // ── Runtime clock ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning && !isEstop) {
      runtimeRef.current = setInterval(() => setRuntimeMs((t) => t + 1000), 1000);
    } else {
      clearInterval(runtimeRef.current);
    }
    return () => clearInterval(runtimeRef.current);
  }, [isRunning, isEstop]);

  // ── E-Stop blink ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEstop) { setEstopBlink(false); return; }
    const t = setInterval(() => setEstopBlink((b) => !b), 400);
    return () => clearInterval(t);
  }, [isEstop]);

  // ── Derived values ────────────────────────────────────────────────────────
  // S1: Stoppsensor – Item hält an
  const sensorActive  = items.some((i) => i.paused && i.position >= SENSOR_POSITION - 1);
  // S2: Lichtschranke – erkennt Item beim Durchlaufen (kein Stopp)
  const sensor2Active = items.some((i) => !i.paused && Math.abs(i.position - SENSOR2_POSITION) < 4);

  let lightColor;
  if (isEstop)          lightColor = estopBlink ? 'red' : null;
  else if (sensorActive) lightColor = 'red';
  else if (!isRunning)  lightColor = hasEverStarted ? 'yellow' : 'red';
  else                  lightColor = 'green';

  const throughput = runtimeMs > 0
    ? ((pieceCount / (runtimeMs / 1000)) * 60).toFixed(1)
    : '0.0';

  // ── Fault log helper ─────────────────────────────────────────────────────
  const addFault = useCallback((msg) => {
    setFaultLog((prev) => [
      { time: timestamp(), msg },
      ...prev,
    ].slice(0, MAX_LOG));
  }, []);

  // ── Simulation tick ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || isEstop) return;

    const interval = setInterval(() => {
      const now = Date.now();

      setItems((prev) => {
        let countedThisTick = 0;

        const next = prev.map((item) => {
          if (item.paused) {
            // Jam detection
            const pausedDuration = now - item.pausedAt;
            if (pausedDuration >= JAM_THRESHOLD && !jamTimerRef.current[item.id]) {
              jamTimerRef.current[item.id] = true;
              addFault(`STAU – Item #${item.id} am Sensor (>${JAM_THRESHOLD / 1000}s)`);
            }

            if (pausedDuration >= PAUSE_DURATION) {
              delete jamTimerRef.current[item.id];
              countedThisTick++;
              return { ...item, paused: false, pausedAt: null };
            }
            return item;
          }

          let newPos = item.position + speedRef.current;

          // Wrap around — disable transition for one tick to avoid flicker
          if (newPos > 108) {
            return {
              ...item,
              position: -8,
              hasPassedSensor: false,
              noTransition: true,
            };
          }

          // Re-enable transition after wrap tick
          if (item.noTransition) {
            return { ...item, noTransition: false };
          }

          // Sensor 1 trigger
          if (newPos >= SENSOR_POSITION && !item.hasPassedSensor) {
            return {
              ...item,
              position: SENSOR_POSITION,
              paused: true,
              pausedAt: now,
              hasPassedSensor: true,
            };
          }

          return { ...item, position: newPos };
        });

        if (countedThisTick > 0) {
          setPieceCount((c) => c + countedThisTick);
        }

        return next;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [isRunning, isEstop, addFault]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (isEstop) return;
    setIsRunning(true);
    setHasEverStarted(true);
    addFault('Motor gestartet');
  };

  const handleStop = () => {
    setIsRunning(false);
    addFault('Motor gestoppt');
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsEstop(false);
    setHasEverStarted(false);
    setItems(makeItems());
    setPieceCount(0);
    setFaultLog([]);
    setRuntimeMs(0);
    jamTimerRef.current = {};
  };

  const handleEstop = () => {
    setIsEstop(true);
    setIsRunning(false);
    addFault('⚠ NOT-AUS ausgelöst!');
  };

  const handleEstopReset = () => {
    setIsEstop(false);
    addFault('NOT-AUS quittiert');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`dashboard ${isEstop ? 'dashboard--estop' : ''}`}>

      {/* ── Header ── */}
      <div className="dashboard__header">
        <div className="dashboard__header-badge">INDUSTRIE v2.0</div>
        <h1 className="dashboard__title">FÖRDERBAND-STEUERUNG</h1>
        <div className="dashboard__header-right">
          <div className="dashboard__runtime">{formatTime(runtimeMs)}</div>
          <div className={`dashboard__run-indicator ${isRunning ? 'dashboard__run-indicator--on' : ''}`}>
            {isRunning ? '● LÄUFT' : '○ GESTOPPT'}
          </div>
        </div>
      </div>

      {/* ── E-Stop banner ── */}
      {isEstop && (
        <div className="dashboard__estop-banner">
          ⚠ NOT-AUS AKTIV — Anlage gesichert
          <button className="btn btn--estop-reset" onClick={handleEstopReset}>
            ✓ QUITTIEREN
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="dashboard__content">

        {/* Sidebar */}
        <div className="dashboard__sidebar">
          <TrafficLight color={lightColor} />
          <div className="dashboard__divider" />

          <Sensor active={sensorActive}  position={SENSOR_POSITION}  label="S1 – STOPPSENSOR" />
          <Sensor active={sensor2Active} position={SENSOR2_POSITION} label="S2 – LICHTSCHRANKE" />
          <div className="dashboard__divider" />

          {/* Stats panel */}
          <div className="dashboard__stats">
            <StatRow label="GEZÄHLT"   value={pieceCount} />
            <StatRow label="TEMPO"     value={`${speed.toFixed(1)}x`} />
            <StatRow
              label="SIGNAL"
              value={(lightColor || 'AUS').toUpperCase()}
              cls={lightColor === 'red' ? 'text-red' : lightColor === 'green' ? 'text-green' : 'text-yellow'}
            />
            <StatRow label="DURCHSATZ" value={`${throughput}/min`} />
            <StatRow label="LAUFZEIT"  value={formatTime(runtimeMs)} />
          </div>
        </div>

        {/* Right side: belt + fault log */}
        <div className="dashboard__main">
          <div className="dashboard__belt-area">
            <div className="dashboard__belt-header">
              <span className="dashboard__belt-title">FÖRDERBAND A1</span>
              <div className="dashboard__belt-header-right">
                <span className="dashboard__belt-sensor-note">S1 Stopp @ {SENSOR_POSITION}%</span>
                <span className="dashboard__belt-sensor-note" style={{ color: '#44aaff' }}>S2 Lichtschranke @ {SENSOR2_POSITION}%</span>
              </div>
            </div>
            <ConveyorBelt
              items={items}
              sensorPosition={SENSOR_POSITION}
              sensor2Position={SENSOR2_POSITION}
              isRunning={isRunning && !isEstop}
            />
          </div>

          {/* Fault / Event log */}
          <div className="dashboard__log">
            <div className="dashboard__log-header">
              <span className="dashboard__log-title">EREIGNIS-LOG</span>
              <span className="dashboard__log-count">{faultLog.length} Einträge</span>
            </div>
            <div className="dashboard__log-entries">
              {faultLog.length === 0 && (
                <div className="dashboard__log-empty">Keine Ereignisse</div>
              )}
              {faultLog.map((entry, i) => (
                <div
                  key={i}
                  className={`dashboard__log-entry ${entry.msg.includes('NOT-AUS') || entry.msg.includes('STAU') ? 'dashboard__log-entry--fault' : ''}`}
                >
                  <span className="dashboard__log-time">{entry.time}</span>
                  <span className="dashboard__log-msg">{entry.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="dashboard__controls">
        <div className="dashboard__buttons">
          <button className="btn btn--start" onClick={handleStart} disabled={isRunning || isEstop}>
            ▶ START
          </button>
          <button className="btn btn--stop" onClick={handleStop} disabled={!isRunning || isEstop}>
            ■ STOP
          </button>
          <button className="btn btn--reset" onClick={handleReset}>
            ↺ RESET
          </button>
          <button className="btn btn--estop" onClick={handleEstop} disabled={isEstop}>
            ⚠ NOT-AUS
          </button>
        </div>

        <div className="dashboard__speed-control">
          <label className="dashboard__speed-label">
            <span>GESCHWINDIGKEIT</span>
            <span className="dashboard__speed-value">{speed.toFixed(1)}</span>
          </label>
          <input
            type="range"
            className="dashboard__speed-slider"
            min="0.2"
            max="3.0"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
          <div className="dashboard__speed-marks">
            <span>LANGSAM</span>
            <span>SCHNELL</span>
          </div>
        </div>
      </div>

      {/* ── Footer warning stripe ── */}
      <div className="dashboard__warning-stripe" />
    </div>
  );
}

function StatRow({ label, value, cls }) {
  return (
    <div className="dashboard__stat">
      <span className="dashboard__stat-label">{label}</span>
      <span className={`dashboard__stat-value ${cls || ''}`}>{value}</span>
    </div>
  );
}
