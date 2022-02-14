import { useCallback, useEffect } from 'react';
import React from 'react';
import Pack from '../DataModels/Pathology/Pack';
import Control from '../Models/Control';
import MenuOptions from '../Models/MenuOptions';
import Creator from '../DataModels/Pathology/Creator';

interface PackSelectProps {
  creator: Creator;
  goToCreatorSelect: () => void;
  packs: Pack[];
  setMenuOptions: (menuOptions: MenuOptions) => void;
  setPackIndex: (packIndex: number | undefined) => void;
}

export default function PackSelect(props: PackSelectProps) {
  const goToCreatorSelect = props.goToCreatorSelect;
  const setMenuOptions = props.setMenuOptions;

  useEffect(() => {
    setMenuOptions(new MenuOptions(
      [
        new Control(goToCreatorSelect, 'Esc'),
      ],
      [],
      undefined,
      props.creator.name,
    ));
  }, [goToCreatorSelect, props.creator, setMenuOptions]);

  const handleKeyDown = useCallback(event => {
    if (event.code === 'Escape') {
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
        onClick={() => props.setPackIndex(i)}
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
