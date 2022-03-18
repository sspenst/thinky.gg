import { useCallback, useEffect } from 'react';
import Color from '../../constants/color';
import Level from '../../models/data/psychopath/level';
import React from 'react';

interface LevelSelectProps {
  goToWorldSelect: () => void;
  levels: Level[];
  setLevelId: (levelId: string | undefined) => void;
}

export default function LevelSelect({ goToWorldSelect, levels, setLevelId }: LevelSelectProps) {
  const handleKeyDown = useCallback(event => {
    if (event.code === 'Escape') {
      goToWorldSelect();
    }
  }, [goToWorldSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const buttons = [];

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const color = level.inPathology ? 'rgb(0 200 0)' : 'white';

    buttons.push(
      <button
        key={i} className={'border-2'}
        onClick={() => setLevelId(level._id)}
        style={{
          width: '200px',
          height: '100px',
          verticalAlign: 'top',
          borderColor: color,
          color: color,
        }}>
        {level.name}
        <br/>
        {level.psychopathId}
      </button>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
