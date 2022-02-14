import React, { useEffect } from 'react';
import Creator from '../DataModels/Pathology/Creator';
import MenuOptions from '../Models/MenuOptions';
import Select from '../Common/Select';

interface CreatorSelectProps {
  creators: Creator[];
  setCreatorIndex: (creatorIndex: number | undefined) => void;
  setMenuOptions: (menuOptions: MenuOptions) => void;
}

export default function CreatorSelect(props: CreatorSelectProps) {
  const setMenuOptions = props.setMenuOptions;

  useEffect(() => {
    setMenuOptions(new MenuOptions(
      [],
      [],
      undefined,
      'PATHOLOGY',
    ));
  }, [setMenuOptions]);

  return (
    <Select
      selectOptions={props.creators.map(creator => <span>{creator.name}</span>)}
      setIndex={(i) => props.setCreatorIndex(i)}
    />
  );
}
