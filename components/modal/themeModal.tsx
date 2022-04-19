import React, { useContext, useEffect, useState } from 'react';
import Modal from '.';
import { PageContext } from '../../contexts/pageContext';

interface RadioButtonProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  text: string;
  theme: string | undefined;
  value: string;
}

function RadioButton({ onChange, text, theme, value }: RadioButtonProps) {
  return (
    <label>
      <input
        checked={theme === value}
        name='theme'
        onChange={onChange}
        style={{
          margin: '0 10px 0 0',
        }}
        type='radio'
        value={value}
      />
      {text}
      <br/>
    </label>
  );
}

interface ThemeModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function ThemeModal({ closeModal, isOpen }: ThemeModalProps) {
  const { forceUpdate } = useContext(PageContext);
  const [theme, setTheme] = useState<string>();

  useEffect(() => {
    setTheme(document.body.className);
  }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTheme = e.currentTarget.value;
    document.body.className = newTheme;
    setTheme(newTheme);
    forceUpdate();
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Theme'}
    >
      <>
        <RadioButton
          onChange={onChange}
          text={'Classic'}
          theme={theme}
          value={'theme-classic'}
        />
        <RadioButton
          onChange={onChange}
          text={'Dark'}
          theme={theme}
          value={'theme-dark'}
        />
        <RadioButton
          onChange={onChange}
          text={'Light'}
          theme={theme}
          value={'theme-light'}
        />
        <RadioButton
          onChange={onChange}
          text={'Modern'}
          theme={theme}
          value={'theme-modern'}
        />
      </>
    </Modal>
  );
}
