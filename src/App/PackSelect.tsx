import { useCallback, useEffect } from 'react';
import React from 'react';
import Control from '../Models/Control';
import MenuOptions from '../Models/MenuOptions';
import Pack from '../DataModels/Pathology/Pack';
import Select from '../Common/Select';

interface PackSelectProps {
  goToCreatorSelect: () => void;
  packs: Pack[];
  setMenuOptions: (menuOptions: MenuOptions) => void;
  setPackIndex: (packIndex: number | undefined) => void;
  title: string;
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
      props.title,
    ));
  }, [goToCreatorSelect, setMenuOptions, props.title]);

  const handleKeyDown = useCallback(event => {
    if (event.code === 'Escape') {
      goToCreatorSelect();
    }
  }, [goToCreatorSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Select
      selectOptions={props.packs.map(pack => <span>{pack.name}</span>)}
      setIndex={(i) => props.setPackIndex(i)}
    />
  );
}
