import React from 'react';
import './ConveyorBelt.css';

export default function ConveyorBelt({ items, sensorPosition, sensor2Position, isRunning }) {
  return (
    <div className="conveyor-wrapper">
      {/* Structural frame with rollers */}
      <div className="conveyor-frame">
        {/* Left roller */}
        <div className="conveyor-roller">
          <div className="conveyor-roller__hub" />
        </div>

        {/* Belt surface */}
        <div className="conveyor-belt">
          {/* Animated belt background */}
          <div className={`conveyor-belt__bg ${isRunning ? 'conveyor-belt__bg--running' : ''}`} />

          {/* Top / bottom edge rails */}
          <div className="conveyor-belt__rail conveyor-belt__rail--top" />
          <div className="conveyor-belt__rail conveyor-belt__rail--bottom" />

          {/* Sensor position markers */}
          <div
            className="conveyor-sensor-line"
            style={{ left: `${sensorPosition}%` }}
          >
            <span className="conveyor-sensor-line__label">▲ S1</span>
          </div>
          {sensor2Position != null && (
            <div
              className="conveyor-sensor-line conveyor-sensor-line--s2"
              style={{ left: `${sensor2Position}%` }}
            >
              <span className="conveyor-sensor-line__label">▲ S2</span>
            </div>
          )}

          {/* Moving items */}
          {items.map((item) => (
            <div
              key={item.id}
              className={`conveyor-item ${item.paused ? 'conveyor-item--paused' : ''}`}
              style={{
                left: `calc(${item.position}% - 25px)`,
                transition: item.noTransition ? 'none' : undefined,
              }}
            >
              <span className="conveyor-item__id">{item.id}</span>
            </div>
          ))}
        </div>

        {/* Right roller */}
        <div className="conveyor-roller">
          <div className="conveyor-roller__hub" />
        </div>
      </div>

      {/* Support legs */}
      <div className="conveyor-legs">
        <div className="conveyor-leg" />
        <div className="conveyor-leg" />
        <div className="conveyor-leg" />
      </div>

      {/* Warning stripe below belt */}
      <div className="conveyor-warning-stripe" />
    </div>
  );
}
