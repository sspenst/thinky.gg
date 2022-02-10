import { useCallback, useEffect } from 'react';

export default function PackSelect(props) {
  const goToCreatorSelect = props.goToCreatorSelect;

  const handleKeyDown = useCallback(event => {
    const { keyCode } = event;

    // return to creator select with esc
    if (keyCode === 27) {
      goToCreatorSelect();
    }
  }, [goToCreatorSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const buttons = [];

  for (let i = 0; i < props.packs.length; i++) {
    const pack = props.packs[i];

    buttons.push(
      <button
        key={i} className={`border-2 font-semibold`}
        onClick={() => props.setPackId(pack._id)}
        style={{
          width: '200px',
          height: '100px',
          verticalAlign: 'top',
        }}>
        {pack.name}
      </button>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
