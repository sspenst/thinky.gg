import TileType from '@root/constants/tileType';
import React, { useEffect, useState } from 'react';
import Level from '../../models/db/level';
import Modal from '.';

interface SizeModalProps {
  closeModal: () => void;
  historyPush: (level: Level) => void;
  isOpen: boolean;
  level: Level;
  setIsDirty: () => void;
  setLevel: (value: React.SetStateAction<Level>) => void;
}

export default function SizeModal({ closeModal, historyPush, isOpen, level, setIsDirty, setLevel }: SizeModalProps) {
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

  function expandDirection(direction: 'left' | 'right' | 'up' | 'down', amount: number) {
    setLevel(prevLevel => {
      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;

      setError(undefined);

      if (direction === 'up' || direction === 'down') {
        if (level.height + amount < 1 || level.height + amount > 40) {
          setError('Height must be between 1 and 40');

          return level;
        }

        level.height += amount;

        if (amount > 0) {
          const newRows = Array(level.width + 1).join(TileType.Default).repeat(amount);

          level.data = direction === 'up' ? newRows + '\n' + level.data : level.data + '\n' + newRows;
        } else {
          const rows = level.data.split('\n');

          level.data = direction === 'up' ? rows.slice(-amount).join('\n') : rows.slice(0, amount).join('\n');
        }
      } else {
        if (level.width + amount < 1 || level.width + amount > 40) {
          setError('Width must be between 1 and 40');

          return level;
        }

        level.width += amount;

        if (amount > 0) {
          const newColumns = Array(amount + 1).join(TileType.Default);

          level.data = level.data.split('\n').map(row => direction === 'left' ? newColumns + row : row + newColumns).join('\n');
        } else {
          level.data = level.data.split('\n').map(row => direction === 'left' ? row.slice(-amount) : row.slice(0, amount)).join('\n');
        }
      }

      historyPush(level);

      return level;
    });
  }

  function onSubmit() {
    setError(undefined);

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

      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;
      const minWidth = Math.min(width, level.width);
      let data = '';

      for (let y = 0; y < height; y++) {
        if (y < level.height) {
          const start = y * (level.width + 1);

          data = data + level.data.substring(start, start + minWidth);
          data = data + Array(width - minWidth + 1).join(TileType.Default);
        } else {
          data = data + Array(width + 1).join(TileType.Default);
        }

        if (y !== height - 1) {
          data = data + '\n';
        }
      }

      level.data = data;
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
      closeModal={() => { setError(undefined); closeModal(); }}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={'Set Level Size'}
    >
      <div className='flex flex-row gap-2  max-w-full items-center'>
        <div className='flex flex-col gap-2 items-center'>
          {!error ? null :
            <div style={{ color: 'var(--color-error)' }}>
              {error}
            </div>
          }
          <div className='flex flex-row gap-2 items-center'>
            <label className='font-semibold' htmlFor='width'>Width</label>
            <input
              className='p-1 rounded-md border w-20'
              name='width'
              onChange={onWidthChange}
              pattern='[0-9]*'
              required
              type='number'
              value={widthStr}
            />
          </div>
          <div className='flex flex-row gap-2 items-center '>
            <label className='font-semibold' htmlFor='height'>Height</label>
            <input
              className='p-1 rounded-md border w-20'
              name='height'
              onChange={onHeightChange}
              pattern='[0-9]*'
              required
              type='number'
              value={heightStr}
            />
          </div>
        </div>
        <div className='flex flex-row gap-2 items-center '>
          <div className='flex flex-row gap-1  items-center'>
            <button
              className='px-1 border hover:bg-gray-500'
              onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                e.preventDefault();
                expandDirection('left', 1);
              }
              }
            >
            +
            </button>
            <button
              className='px-1  border hover:bg-gray-500'
              onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                e.preventDefault();
                expandDirection('left', -1);
              }
              }
            >
            -
            </button>
          </div>
          <div className='flex flex-col gap-1 items-center'>
            <div className='flex flex-row gap-1  items-center'>
              <button
                className='px-1 border hover:bg-gray-500'
                onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                  e.preventDefault();
                  expandDirection('up', 1);
                }
                }
              >
            +
              </button>
              <button
                className='px-1  border hover:bg-gray-500'
                onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                  e.preventDefault();
                  expandDirection('up', -1);
                }
                }
              >
            -
              </button>
            </div>
            { /** The rect */}
            <div className='border-2 border-gray-200 m-1 w-10 h-16' />
            <div className='flex flex-row gap-1  items-center'>
              <button
                className='px-1 border hover:bg-gray-500'
                onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                  e.preventDefault();
                  expandDirection('down', 1);
                }
                }
              >
            +
              </button>
              <button
                className='px-1  border hover:bg-gray-500'
                onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                  e.preventDefault();
                  expandDirection('down', -1);
                }
                }
              >
            -
              </button>
            </div>
          </div>
          <div className='flex flex-row gap-1  items-center'>
            <button
              className='px-1 border hover:bg-gray-500'
              onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                e.preventDefault();
                expandDirection('right', 1);
              }
              }
            >
            +
            </button>
            <button
              className='px-1  border hover:bg-gray-500'
              onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                e.preventDefault();
                expandDirection('right', -1);
              }
              }
            >
            -
            </button>
          </div>

        </div>

      </div>
    </Modal>
  );
}
