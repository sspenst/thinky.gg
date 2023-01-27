import React from 'react';

interface RadioButtonProps {
  currentValue: string | undefined;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  text: string;
  value: string;
}

export default function RadioButton({ currentValue, name, onChange, text, value }: RadioButtonProps) {
  return (
    <label>
      <input
        checked={currentValue === value}
        name={name}
        onChange={onChange}
        style={{
          margin: '0 10px 0 0',
        }}
        type='radio'
        value={value}
      />
      {text}
      <br />
    </label>
  );
}
