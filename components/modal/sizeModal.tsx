import React, { useEffect, useState } from 'react';
import Level from '../../models/db/level';
import Modal from '.';
import cloneLevel from '../../helpers/cloneLevel';

interface SizeModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  setLevel: (value: React.SetStateAction<Level | undefined>) => void;
}

export default function SizeModal({ closeModal, isOpen, level, setLevel }: SizeModalProps) {
  const [height, setHeight] = useState<number>();
  const [width, setWidth] = useState<number>();

  useEffect(() => {
    setHeight(level.height);
    setWidth(level.width);
  }, [level]);

  function onHeightChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.currentTarget.value);
    setHeight(isNaN(value) ? 0 : value);
  }

  function onWidthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.currentTarget.value);
    setWidth(isNaN(value) ? 0 : value);
  }

  function onSubmit() {
    // TODO: show an error message for invalid input
    if (!height || !width || height > 100 || width > 100) {
      return;
    }

    setLevel(prevLevel => {
      if (!prevLevel) {
        return prevLevel;
      }

      const level = cloneLevel(prevLevel);

      let data = '';
      const minWidth = Math.min(width, level.width);

      for (let y = 0; y < height; y++) {
        if (y < level.height) {
          const start = y * (level.width + 1);
          data += level.data.substring(start, start + minWidth);
          data += Array(width - minWidth + 1).join('0');
        } else {
          data += Array(width + 1).join('0');
        }

        data += '\n';
      }

      level.data = data;
      level.height = height;
      level.width = width;
      return level;
    });

    closeModal();
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={'Set Level Size'}
    >
      <>
        <label htmlFor='width'>Width:</label>
        <br/>
        <input
          name='width'
          onChange={onWidthChange}
          pattern='[0-9]*'
          required
          style={{color: 'rgb(0, 0, 0)'}}
          type='text'
          value={width}
        />
        <br/>
        <label htmlFor='height'>Height:</label>
        <br/>
        <input
          name='height'
          onChange={onHeightChange}
          pattern='[0-9]*'
          required
          style={{color: 'rgb(0, 0, 0)'}}
          type='text'
          value={height}
        />
      </>
    </Modal>
  );
}
