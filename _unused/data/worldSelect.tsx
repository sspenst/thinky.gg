import { useCallback, useEffect } from 'react';
import Color from '../../constants/color';
import React from 'react';
import World from '../../models/data/psychopath/world';

interface WorldSelectProps {
  goToUniverseSelect: () => void;
  setWorldId: (worldId: string | undefined) => void;
  worlds: World[];
}

export default function WorldSelect({ goToUniverseSelect, setWorldId, worlds }: WorldSelectProps) {
  const handleKeyDown = useCallback(event => {
    if (event.code === 'Escape') {
      goToUniverseSelect();
    }
  }, [goToUniverseSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const buttons = [];

  for (let i = 0; i < worlds.length; i++) {
    const world = worlds[i];
    const color = world.inPathology ? Color.SelectComplete : Color.TextDefault;

    buttons.push(
      <button
        key={i} className={'border-2'}
        onClick={() => setWorldId(world._id)}
        style={{
          width: '200px',
          height: '100px',
          verticalAlign: 'top',
          borderColor: color,
          color: color,
        }}>
        {world.name}
        <br/>
        {world.psychopathId}
      </button>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
