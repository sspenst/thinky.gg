import { useCallback, useEffect } from 'react';
import Color from './Color';
import LevelDataHelper from './LevelDataHelper';
import LevelDataType from './LevelDataType';

export default function LevelSelect(props) {
  const goToPackSelect = props.goToPackSelect;

  const handleKeyDown = useCallback(event => {
    const { keyCode } = event;

    // return to pack select with esc
    if (keyCode === 27) {
      goToPackSelect();
    }
  }, [goToPackSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function getSymbols(level) {
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
      } else if (LevelDataHelper.canMoveRestricted(data[i])) {
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
