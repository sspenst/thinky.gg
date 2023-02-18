import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import LevelDataType from '../../constants/levelDataType';
import Level from '../../models/db/level';
import Modal from '.';
import * as transformLevel from '../../helpers/transformLevel';

interface ModifyModalProps {
  closeModal: () => void;
  historyPush: (level: Level) => void;
  isOpen: boolean;
  level: Level;
  setIsDirty: () => void;
  setLevel: (value: React.SetStateAction<Level>) => void;
}

export default function ModifyModal({ closeModal, historyPush, isOpen, level, setIsDirty, setLevel }: ModifyModalProps) {
  const [error, setError] = useState('');
  const [toTrim, setToTrim] = useState(true);
  const [transformType, setTransformType] = useState('identity');

  function onSubmit() {
    setError(undefined);

    setLevel(prevLevel => {
      if (!prevLevel) {
        return prevLevel;
      }

      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;
      
      // hold level data
      var data = level.data;
      // trim first
      if (toTrim) {
        data = transformLevel.trimLevel(level.data);
      }
      // then transform
      switch (transformType) {
        case "identity":
          console.log("no transform");
          break;
        case "cw":
          console.log("cw 90");
          data = transformLevel.rotateLevelCW(data);
          break;
        case "ccw2":
          console.log("cw 180");
          data = transformLevel.rotateLevelCCW(data);
          data = transformLevel.rotateLevelCCW(data);
          break;
        case "ccw":
          console.log("cw 270");
          data = transformLevel.rotateLevelCCW(data);
          break;
        case "fX":
          console.log("flip x");
          data = transformLevel.flipLevelX(data);
          break;
        case "fY":
          console.log("flip y");
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
      title={'Transform Level'}
    >
      <div className='flex flex-col gap-2 max-w-full'>
        <div className='flex flex-row gap-2 items-center w-full'>
          <label className='font-semibold' htmlFor='trim'>Trim?</label>
          <input id='chk_totrim'
            checked={toTrim}
            className='self-center mb-2'
            name='totrim'
            type='checkbox'
            onChange={(checkbox: React.ChangeEvent<HTMLInputElement>) => {
              setToTrim(checkbox.target.checked);
            }}
          />
        </div>
        <div className='flex flex-row gap-2 items-center w-full'>
          <label className='font-semibold' htmlFor='rotateOrFlip'>Transform:</label>
          <Select
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(option: any) => {
              setTransformType(option.value);
            }}
            defaultValue={{label: 'Choose Transform', value: 'identity'}}
            isSearchable={false}
            styles={{
              menuPortal: base => ({ ...base, zIndex: 9999, color: 'black' }),
              menu: base => ({ ...base, zIndex: 9999 }),
              // adjust width of dropdown
              control: base => ({ ...base, width: '300px' }),
            }}
            placeholder='Choose Transform'
            className='text-black'
            menuPortalTarget={(typeof window !== 'undefined') ? document.body : null}
            components={{
              IndicatorSeparator: null,
            }}
            formatOptionLabel={({ label }: {label: string, value: MultiplayerMatchType}) => {
              const [type, time] = label.split('|');

              return (
                <div className='flex flex-row gap-2'>
                  <span>{type}</span>
                  <span className='text-gray-500'>{time}</span>
                </div>
              );}
            }
            // Bullet, Blitz, Rapid, Classical
            options={[
                {label: 'No transform |', value: 'identity'},
                {label: 'Rotate | 90° clockwise', value: 'cw'},
                {label: 'Rotate | 180° clockwise', value: 'ccw2'},
                {label: 'Rotate | 270° clockwise', value: 'ccw'},
                {label: 'Flip | horizontal', value: 'fX'},
                {label: 'Flip | vertical', value: 'fY'},
              ] as never
            }
          />
        </div>
        {!error ? null :
          <div style={{ color: 'var(--color-error)' }}>
            {error}
          </div>
        }
      </div>
    </Modal>
  );
}
