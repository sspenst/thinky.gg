import { useCallback, useEffect } from 'react';
import React from 'react';
import Level from '../DataModels/Psychopath/Level';
import Color from '../Constants/Color';

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
    const color = level.inPathology ? Color.SelectComplete : Color.TextDefault;

    buttons.push(
      <button
        key={i} className={'border-2 font-semibold'}
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
