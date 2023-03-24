import React from 'react';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import { MultiplayerMatchType } from '../../models/MultiplayerEnums';
import Modal from '.';

interface CreateMatchModalProps {
  closeModal: () => void;
  isOpen: boolean;
  onConfirm: (matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => void;
}

export default function CreateMatchModal({ closeModal, isOpen, onConfirm }: CreateMatchModalProps) {
  const [matchType, setMatchType] = React.useState<MultiplayerMatchType>();
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [isRated, setIsRated] = React.useState(true);
  const options = [
    { label: 'Bullet | (3m)', value: MultiplayerMatchType.RushBullet },
    { label: 'Blitz | (5m)', value: MultiplayerMatchType.RushBlitz },
    { label: 'Rapid | (10m)', value: MultiplayerMatchType.RushRapid },
    { label: 'Classical | (30m)', value: MultiplayerMatchType.RushClassical },
  ];
  const defaultValue = options.find((option) => option.value === matchType);

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onConfirm={() => {
        if (!matchType) {
          toast.dismiss();
          toast.error('Please select a game type');

          return;
        }

        onConfirm(matchType, isPrivate, isRated);
      }}
      title={'Create Match'}
    >
      <div className='items-center flex flex-col '>
        <div className='p-3'>
          <span className=''>Start a multiplayer match and invite your friends to play!</span>
        </div>
        <div>
          <div className='p-1 grid grid-cols-2 items-center gap-2'>
            <div className='p-1 flex flex-col'>
              <div className='p-1 flex flex-row gap-2'>
                <input id='chk_private'
                  checked={isPrivate}
                  className='self-center mb-2'
                  name='private'
                  type='checkbox'
                  onChange={(checkbox: React.ChangeEvent<HTMLInputElement>) => {
                    setIsPrivate(checkbox.target.checked);
                  }} />
                <label className='block font-bold mb-2  self-center' htmlFor='chk_private'>
            Private?
                </label>

              </div>
              <div className='p-1 flex flex-row gap-2'>
                <input id='chk_rated' checked={isRated} className='self-center mb-2' name='rated' type='checkbox' onChange={(checkbox: React.ChangeEvent<HTMLInputElement>) => {
                  setIsRated(checkbox.target.checked);
                }} />
                <label className='block font-bold mb-2  self-center' htmlFor='chk_rated'>
            Rated?
                </label>

              </div>
            </div>
            <Select
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(option: any) => {
                setMatchType(option.value);
              }}
              defaultValue={defaultValue}
              isSearchable={false}
              styles={{
                menuPortal: base => ({ ...base, zIndex: 9999, color: 'black' }),
                menu: base => ({ ...base, zIndex: 9999 }),
                // adjust width of dropdown
                control: base => ({ ...base, width: '200px' }),
              }}
              placeholder='Game type'
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
                );
              }
              }
              // Bullet, Blitz, Rapid, Classical
              options={options as never}
            />

          </div>
        </div>
      </div>
    </Modal>
  );
}
