import React from 'react';
import PsychopathUniverse from '../Models/PsychopathUniverse';

interface UniverseSelectProps {
  setUniverseId: (universeId: string | undefined) => void;
  universes: PsychopathUniverse[];
}

export default function UniverseSelect(props: UniverseSelectProps) {
  const buttons = [];

  for (let i = 0; i < props.universes.length; i++) {
    const universe = props.universes[i];
    const color = universe.inPathology ? 'rgb(0, 200, 0)' : 'rgb(255, 255, 255)';

    buttons.push(
      <button
        key={i} className={`border-2 font-semibold`}
        onClick={() => props.setUniverseId(universe._id)}
        style={{
          width: '200px',
          height: '100px',
          verticalAlign: 'top',
          borderColor: color,
          color: color,
        }}>
        {universe.name}
        <br/>
        <span className={`text-xs`}>{universe.email}</span>
        <br/>
        {universe.psychopathId}
      </button>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
