import Color from './Color';

export default function LevelSelect(props) {
  const buttons = [];

  for (let i = 0; i < props.levels.length; i++) {
    const level = props.levels[i];

    buttons.push(
      <button
        key={i} className={`border`}
        onClick={() => props.chooseLevel(i)}
        style={{
          width: '200px',
          height: '100px',
          verticalAlign: 'top',
        }}>
        {level.name}
        <br/>
        {level.author}
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
