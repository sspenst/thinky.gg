import { useCallback, useEffect } from 'react';
import React from 'react';
import Color from '../Constants/Color';
import LevelDataType from '../Constants/LevelDataType';
import Level from '../DataModels/Pathology/Level';
import Control from '../Models/Control';
import MenuOptions from '../Models/MenuOptions';
import Pack from '../DataModels/Pathology/Pack';

interface LevelSelectProps {
  goToPackSelect: () => void;
  levels: Level[];
  pack: Pack;
  setLevelIndex: (levelIndex: number | undefined) => void;
  setMenuOptions: (menuOptions: MenuOptions) => void;
}

export default function LevelSelect(props: LevelSelectProps) {
  const goToPackSelect = props.goToPackSelect;
  const setMenuOptions = props.setMenuOptions;

  useEffect(() => {
    setMenuOptions(new MenuOptions(
      [
        new Control(goToPackSelect, 'Esc'),
      ],
      [],
      undefined,
      props.pack.name,
    ));
  }, [goToPackSelect, props.pack, setMenuOptions]);

  const handleKeyDown = useCallback(event => {
    if (event.code === 'Escape') {
      goToPackSelect();
    }
  }, [goToPackSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function getSymbols(level: Level) {
    let symbols = [];

    if (level.psychopathId) {
      symbols.push(<span key='legacy' style={{color: 'rgb(255, 50, 50)'}}>▲ </span>);
    }

    const data = level.data;
    let block = false;
    let hole = false;
    let restrict = false;

    for (let i = 0; i < data.length; i++) {
      if (data[i] === LevelDataType.Block) {
        block = true;
      } else if (data[i] === LevelDataType.Hole) {
        hole = true;
      } else if (LevelDataType.canMoveRestricted(data[i])) {
        restrict = true;
      }
    }

    if (block) {
      symbols.push(<span key='block' style={{color: Color.Block}}>■ </span>);
    }

    if (hole) {
      symbols.push(<span key='hole' style={{color: 'rgb(16, 185, 129)'}}>● </span>);
    }

    if (restrict) {
      symbols.push(<span key='restrict' style={{color: 'rgb(255, 205, 50)'}}>♦ </span>);
    }

    return symbols;
  }

  const buttons = [];

  for (let i = 0; i < props.levels.length; i++) {
    const level = props.levels[i];

    buttons.push(
      <button
        key={i} className={`border-2 font-semibold`}
        onClick={() => props.setLevelIndex(i)}
        style={{
          width: '200px',
          height: '100px',
          verticalAlign: 'top',
        }}>
        {level.name}
        <br/>
        {level.author}
        <br/>
        {getSymbols(level)}
      </button>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
