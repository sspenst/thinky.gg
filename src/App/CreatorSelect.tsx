import React, { useEffect } from 'react';
import Creator from '../DataModels/Pathology/Creator';
import Control from '../Models/Control';

interface CreatorSelectProps {
  creators: Creator[];
  setControls: (controls: Control[]) => void;
  setCreatorId: (creatorId: string | undefined) => void;
}

export default function CreatorSelect(props: CreatorSelectProps) {
  const setControls = props.setControls;

  useEffect(() => {
    setControls([
      new Control(() => console.log('Info'), 'Info'),
    ]);
  }, [setControls]);

  const buttons = [];

  for (let i = 0; i < props.creators.length; i++) {
    const creator = props.creators[i];

    buttons.push(
      <button
        key={i} className={`border-2 font-semibold`}
        onClick={() => props.setCreatorId(creator._id)}
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
