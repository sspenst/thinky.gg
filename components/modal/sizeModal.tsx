import React, { useEffect, useState } from 'react';
import LevelDataType from '../../constants/levelDataType';
import cloneLevel from '../../helpers/cloneLevel';
import Level from '../../models/db/level';
import Modal from '.';

interface SizeModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  setIsDirty: () => void;
  setLevel: (value: React.SetStateAction<Level | undefined>) => void;
}

export default function SizeModal({ closeModal, isOpen, level, setIsDirty, setLevel }: SizeModalProps) {
  const [error, setError] = useState<string>();
  const [heightStr, setHeightStr] = useState('');
  const [widthStr, setWidthStr] = useState('');

  useEffect(() => {
    setHeightStr(level.height.toString());
    setWidthStr(level.width.toString());
  }, [level]);

  function onHeightChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHeightStr(e.currentTarget.value);
  }

  function onWidthChange(e: React.ChangeEvent<HTMLInputElement>) {
    setWidthStr(e.currentTarget.value);
  }

  function onSubmit() {
    const height = Number(heightStr);
    const width = Number(widthStr);

    if (height < 1 || height > 40) {
      setError('Height must be between 1 and 40');

      return;
    } else if (width < 1 || width > 40) {
      setError('Width must be between 1 and 40');

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
          data += Array(width - minWidth + 1).join(LevelDataType.Default);
        } else {
          data += Array(width + 1).join(LevelDataType.Default);
        }

        if (y !== height - 1) {
          data += '\n';
        }
      }

      // there must always be a start
      if (data.indexOf(LevelDataType.Start) === -1) {
        data = LevelDataType.Start + data.substring(1, data.length);
      }

      // there must always be an end
      if (data.indexOf(LevelDataType.End) === -1) {
        data = data.substring(0, data.length - 1) + LevelDataType.End;
      }

      level.data = data;
      level.height = height;
      level.width = width;

      return level;
    });

    setIsDirty();
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
          style={{ color: 'rgb(0, 0, 0)' }}
          type='number'
          value={widthStr}
        />
        <br/>
        <label htmlFor='height'>Height:</label>
        <br/>
        <input
          name='height'
          onChange={onHeightChange}
          pattern='[0-9]*'
          required
          style={{ color: 'rgb(0, 0, 0)' }}
          type='number'
          value={heightStr}
        />
        {!error ? null :
          <div style={{ color: 'var(--color-error)' }}>
            {error}
          </div>
        }
      </>
    </Modal>
  );
}
