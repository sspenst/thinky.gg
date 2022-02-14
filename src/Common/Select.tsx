import React from 'react';

interface SelectProps {
  selectOptions: JSX.Element[];
  setIndex: (index: number) => void;
}

export default function Select(props: SelectProps) {
  const buttons = [];

  for (let i = 0; i < props.selectOptions.length; i++) {
    buttons.push(
      <button
        key={i} className={`border-2 font-semibold`}
        onClick={() => props.setIndex(i)}
        style={{
          width: '200px',
          height: '100px',
          verticalAlign: 'top',
        }}>
        {props.selectOptions[i]}
      </button>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
