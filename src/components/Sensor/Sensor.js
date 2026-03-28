import React from 'react';
import './Sensor.css';

export default function Sensor({ active, position, label }) {
  return (
    <div className={`sensor ${active ? 'sensor--active' : ''}`}>
      <div className="sensor__indicator" />
      <div className="sensor__info">
        <div className="sensor__name">{label || 'SENSOR'}</div>
        <div className="sensor__position">POS: {position}%</div>
        <div className={`sensor__status ${active ? 'sensor__status--active' : ''}`}>
          {active ? '⬛ AUSGELÖST' : '◻ BEREIT'}
        </div>
      </div>
    </div>
  );
}
