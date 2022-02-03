import Color from './Color';
import LevelDataHelper from './LevelDataHelper';
import LevelDataType from './LevelDataType';

export default function LevelSelect(props) {
  function getSymbols(data) {
    let symbols = [];
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
      symbols.push(<span key='restrict' style={{color: 'rgb(255, 205, 50)'}}>◧ </span>);
    }

    return symbols;
  }

  const buttons = [];

  for (let i = 0; i < props.levels.length; i++) {
    const level = props.levels[i];

    buttons.push(
      <button
        key={i} className={`border`}
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
        {getSymbols(level.data)}
      </button>
    );
  }

  return (
    <div
      style={{
        color: Color.TextLevelSelect,
      }}>
      {buttons}
    </div>
  );
}
