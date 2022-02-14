import React, { useEffect } from 'react';
import Creator from '../DataModels/Pathology/Creator';
import MenuOptions from '../Models/MenuOptions';

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

  const buttons = [];

  for (let i = 0; i < props.creators.length; i++) {
    const creator = props.creators[i];

    buttons.push(
      <button
        key={i} className={`border-2 font-semibold`}
        onClick={() => props.setCreatorIndex(i)}
        style={{
          width: '200px',
          height: '100px',
          verticalAlign: 'top',
        }}>
        {creator.name}
      </button>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
