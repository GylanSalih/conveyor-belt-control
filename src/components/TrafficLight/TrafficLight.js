import React from 'react';
import './TrafficLight.css';

export default function TrafficLight({ color }) {
  return (
    <div className="traffic-light">
      <div className="traffic-light__label">STATUS</div>
      <div className="traffic-light__housing">
        <div className={`traffic-light__led traffic-light__led--red ${color === 'red' ? 'traffic-light__led--on' : ''}`} />
        <div className={`traffic-light__led traffic-light__led--yellow ${color === 'yellow' ? 'traffic-light__led--on' : ''}`} />
        <div className={`traffic-light__led traffic-light__led--green ${color === 'green' ? 'traffic-light__led--on' : ''}`} />
      </div>
      <div className="traffic-light__pole" />
      <div className="traffic-light__base" />
    </div>
  );
}
