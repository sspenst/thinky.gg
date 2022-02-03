import Color from './Color';
import LevelDataType from './LevelDataType';

export default function LevelSelect(props) {
  function getSymbols(data) {
    let symbols = [];

    let block = false;
    let hole = false;
    let restrict = false;

    for (let i = 0; i < data.length; i++) {
      switch (data[i]) {
        case LevelDataType.Block:
          block = true;
          break;
        case LevelDataType.Hole:
          hole = true;
          break;
        case LevelDataType.Left:
        case LevelDataType.Up:
        case LevelDataType.Right:
        case LevelDataType.Down:
        case LevelDataType.Upleft:
        case LevelDataType.Upright:
        case LevelDataType.Downright:
        case LevelDataType.Downleft:
          restrict = true;
          break;
        default:
          continue;
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
