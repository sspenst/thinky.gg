import React, { useEffect, useState } from 'react';
import LevelDataType from '../../constants/levelDataType';
import useTextAreaWidth from '../../hooks/useTextAreaWidth';
import Level from '../../models/db/level';
import Modal from '.';

interface DataModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  setIsDirty: () => void;
  setLevel: (value: React.SetStateAction<Level | undefined>) => void;
}

export default function DataModal({ closeModal, isOpen, level, setIsDirty, setLevel }: DataModalProps) {
  const [data, setData] = useState('');
  const [error, setError] = useState<string>();
  const [textAreaRows, setTextAreaRows] = useState(1);

  useEffect(() => {
    setData(level.data);
    setTextAreaRows(level.height);
  }, [level]);

  function onDataChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setData(e.currentTarget.value);
  }

  function onSubmit() {
    const rows = data.trim().split('\n');
    const height = rows.length;
    const width = rows[0].length;

    if (height > 40) {
      setError('Height cannot be greater than 40');

      return;
    } else if (width > 40) {
      setError('Width cannot be greater than 40');

      return;
    }

    let start = 0;
    let end = 0;

    for (let i = 0; i < height; i++) {
      if (rows[i].length != width) {
        setError('Each row must have the same width');

        return;
      }

      for (let j = 0; j < width; j++) {
        const invalidLevelDataType = LevelDataType.getInvalidLevelDataType(rows[i][j]);

        if (invalidLevelDataType) {
          setError(`Invalid level data type: ${invalidLevelDataType}`);

          return;
        }

        if (rows[i][j] === LevelDataType.Start) {
          start += 1;
        } else if (rows[i][j] === LevelDataType.End) {
          end += 1;
        }
      }
    }

    if (start !== 1) {
      setError('There must be exactly one start position');

      return;
    }

    if (end === 0) {
      setError('There must be an end position');

      return;
    }

    // no errors found
    setError(undefined);
    setLevel(prevLevel => {
      if (!prevLevel) {
        return prevLevel;
      }

      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;

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
      title={'Edit Level Data'}
    >
      <>
        <textarea
          className='p-1 rounded-md'
          name='data'
          onChange={onDataChange}
          required
          rows={textAreaRows}
          style={{
            color: 'rgb(0, 0, 0)',
            width: useTextAreaWidth(),
          }}
          value={data}
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
