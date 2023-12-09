import React, { useState } from 'react';
import Select, { CSSObjectWithLabel } from 'react-select';
import * as transformLevel from '../../helpers/transformLevel';
import Level from '../../models/db/level';
import Modal from '.';

interface ModifyModalProps {
  closeModal: () => void;
  historyPush: (level: Level) => void;
  isOpen: boolean;
  setIsDirty: () => void;
  setLevel: (value: React.SetStateAction<Level>) => void;
}

export default function ModifyModal({ closeModal, historyPush, isOpen, setIsDirty, setLevel }: ModifyModalProps) {
  const [toTrim, setToTrim] = useState(true);
  const [transformType, setTransformType] = useState('identity');

  function onSubmit() {
    setLevel(prevLevel => {
      if (!prevLevel) {
        return prevLevel;
      }

      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;

      // hold level data
      let data = level.data;

      // trim first
      if (toTrim) {
        data = transformLevel.trimLevel(level.data);
      }

      // then transform
      switch (transformType) {
      case 'identity':
        break;
      case 'cw':
        data = transformLevel.rotateLevelCW(data);
        break;
      case 'cw2':
        data = transformLevel.rotateLevelCCW(data);
        data = transformLevel.rotateLevelCCW(data);
        break;
      case 'cw3':
        data = transformLevel.rotateLevelCCW(data);
        break;
      case 'fX':
        data = transformLevel.flipLevelX(data);
        break;
      case 'fY':
        data = transformLevel.flipLevelY(data);
        break;
      }

      // update level properties
      level.data = data;
      level.height = transformLevel.getHeight(data);
      level.width = transformLevel.getWidth(data);

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
      title={'Modify Level'}
    >
      <div className='flex flex-col gap-2 max-w-full'>
        <div className='flex flex-row gap-2 items-center w-full'>
          <label className='font-semibold' htmlFor='trim'>Trim?</label>
          <input
            checked={toTrim}
            id='trim'
            name='trim'
            onChange={() => setToTrim(prevToTrim => !prevToTrim)}
            type='checkbox'
          />
        </div>
        <div className='flex flex-row gap-2 items-center w-full'>
          <label className='font-semibold' htmlFor='rotateOrFlip'>Transform:</label>
          <Select
            className='text-black'
            defaultValue={{ label: 'Choose Transform', value: 'identity' }}
            formatOptionLabel={({ label }: {label: string, value: string}) => {
              const [type, time] = label.split('|');

              return (
                <div className='flex flex-row gap-2'>
                  <span>{type}</span>
                  <span className='text-gray-500'>{time}</span>
                </div>
              );
            }
            }
            isSearchable={false}
            menuPlacement='auto'
            menuPortalTarget={(typeof window !== 'undefined') ? document.body : null}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(option: any) => {
              setTransformType(option.value);
            }}
            options={[
              { label: 'No transform |', value: 'identity' },
              { label: 'Rotate | 90° clockwise', value: 'cw' },
              { label: 'Rotate | 180° clockwise', value: 'cw2' },
              { label: 'Rotate | 270° clockwise', value: 'cw3' },
              { label: 'Flip | horizontal', value: 'fX' },
              { label: 'Flip | vertical', value: 'fY' },
            ]}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999, color: 'black' }) as CSSObjectWithLabel,
              menu: base => ({ ...base, zIndex: 9999 }) as CSSObjectWithLabel,
              control: base => ({ ...base, width: '300px' }) as CSSObjectWithLabel,
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
