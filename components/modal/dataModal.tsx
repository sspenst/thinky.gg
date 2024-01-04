import TileType from '@root/constants/tileType';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import React, { useEffect, useState } from 'react';
import Level from '../../models/db/level';
import Modal from '.';

interface DataModalProps {
  closeModal: () => void;
  historyPush: (level: Level) => void;
  isOpen: boolean;
  level: Level;
  setIsDirty: () => void;
  setLevel: (value: React.SetStateAction<Level>) => void;
}

export default function DataModal({ closeModal, historyPush, isOpen, level, setIsDirty, setLevel }: DataModalProps) {
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
    const rows = data.replace(/^\s+|\s+$/g, '').split('\n');
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

    for (let i = 0; i < height; i++) {
      if (rows[i].length != width) {
        setError('Each row must have the same width');

        return;
      }

      for (let j = 0; j < width; j++) {
        const invalidTileType = TileTypeHelper.getInvalidTileType(rows[i][j]);

        if (invalidTileType) {
          setError(`Invalid level data type: ${invalidTileType}`);

          return;
        }

        if (rows[i][j] === TileType.Player) {
          start += 1;
        }
      }
    }

    if (start > 1) {
      setError('There cannot be more than one player');

      return;
    }

    // no errors found
    setError(undefined);
    setLevel(prevLevel => {
      if (!prevLevel) {
        return prevLevel;
      }

      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;

      level.data = rows.join('\n');
      level.height = height;
      level.width = width;

      historyPush(level);

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
      <div className='flex flex-col gap-2 w-112 max-w-full'>
        <textarea
          style={{
          // monospace
            fontFamily: 'monospace',
            fontSize: '0.9rem',
          }}
          className='p-1 rounded-md border'
          name='data'
          onChange={onDataChange}
          required
          rows={textAreaRows}
          value={data}
        />
        {!error ? null :
          <div style={{ color: 'var(--color-error)' }}>
            {error}
          </div>
        }
      </div>
    </Modal>
  );
}
