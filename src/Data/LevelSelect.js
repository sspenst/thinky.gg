import { useCallback, useEffect } from 'react';

export default function LevelSelect(props) {
  const goToWorldSelect = props.goToWorldSelect;

  const handleKeyDown = useCallback(event => {
    const { keyCode } = event;

    // return to pack select with esc
    if (keyCode === 27) {
      goToWorldSelect();
    }
  }, [goToWorldSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const buttons = [];

  for (let i = 0; i < props.levels.length; i++) {
    const level = props.levels[i];
    const color = level.inPathology ? 'rgb(0, 200, 0)' : 'rgb(255, 255, 255)';

    buttons.push(
      <button
        key={i} className={`border-2 font-semibold`}
        onClick={() => props.setLevelId(level._id)}
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
