import { multiplayerMatchTypeToText } from '@root/helpers/multiplayerHelperFunctions';
import React from 'react';
import { toast } from 'react-hot-toast';
import Select, { CSSObjectWithLabel } from 'react-select';
import { MultiplayerMatchType } from '../../models/constants/multiplayer';
import Modal from '.';

interface CreateMatchModalProps {
  closeModal: () => void;
  isOpen: boolean;
  onConfirm: (matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => void;
}

export default function CreateMatchModal({ closeModal, isOpen, onConfirm }: CreateMatchModalProps) {
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [isRated, setIsRated] = React.useState(true);
  const [matchType, setMatchType] = React.useState<MultiplayerMatchType>();

  const options = Object.values(MultiplayerMatchType).map(type => {
    return {
      label: multiplayerMatchTypeToText(type),
      value: type,
    };
  });

  const defaultValue = options.find(option => option.value === matchType);

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
      <div className='flex flex-col gap-6'>
        {/* Description */}
        <div className='text-center'>
          <p className='text-white/80 text-base leading-relaxed'>
            Start a multiplayer match and challenge players worldwide!
          </p>
        </div>
        
        {/* Main Content */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* Settings Column */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white mb-3'>Match Settings</h3>
            
            {/* Private Match Toggle */}
            <div className='relative'>
              <div className='absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 blur-sm opacity-50' />
              <div className='relative bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/20'>
                <div className='flex items-center gap-3'>
                  <input 
                    id='chk_private'
                    checked={isPrivate}
                    className='w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 focus:ring-2'
                    name='private'
                    type='checkbox'
                    onChange={(checkbox: React.ChangeEvent<HTMLInputElement>) => {
                      setIsPrivate(checkbox.target.checked);
                    }} 
                  />
                  <label className='text-white font-medium flex-1' htmlFor='chk_private'>
                    Private Match
                    <div className='text-sm text-white/60 mt-1'>Only invited players can join</div>
                  </label>
                  <span className='text-2xl'>{isPrivate ? '🔒' : '🌍'}</span>
                </div>
              </div>
            </div>

            {/* Rated Match Toggle */}
            <div className='relative'>
              <div className='absolute -inset-1 bg-gradient-to-r from-green-600/20 to-emerald-600/20 blur-sm opacity-50' />
              <div className='relative bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/20'>
                <div className='flex items-center gap-3'>
                  <input 
                    id='chk_rated' 
                    checked={isRated} 
                    className='w-4 h-4 text-green-600 bg-gray-800 border-gray-600 rounded focus:ring-green-500 focus:ring-2'
                    name='rated' 
                    type='checkbox' 
                    onChange={(checkbox: React.ChangeEvent<HTMLInputElement>) => {
                      setIsRated(checkbox.target.checked);
                    }} 
                  />
                  <label className='text-white font-medium flex-1' htmlFor='chk_rated'>
                    Rated Match
                    <div className='text-sm text-white/60 mt-1'>Affects your Elo rating</div>
                  </label>
                  <span className='text-2xl'>{isRated ? '📈' : '🎯'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Type Column */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-white mb-3'>Game Type</h3>
            <div className='relative'>
              <div className='absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 blur-sm opacity-50' />
              <div className='relative bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/20'>
                <Select
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(option: any) => {
                    setMatchType(option.value);
                  }}
                  defaultValue={defaultValue}
                  isSearchable={false}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999, color: 'black' }) as CSSObjectWithLabel,
                    menu: base => ({ ...base, zIndex: 9999, backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.2)' }) as CSSObjectWithLabel,
                    control: base => ({ 
                      ...base, 
                      width: '100%',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '0.5rem',
                      minHeight: '48px'
                    }) as CSSObjectWithLabel,
                    singleValue: base => ({ ...base, color: 'white' }) as CSSObjectWithLabel,
                    placeholder: base => ({ ...base, color: 'rgba(255,255,255,0.6)' }) as CSSObjectWithLabel,
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused ? 'rgba(59, 130, 246, 0.5)' : 'transparent',
                      color: 'white',
                      padding: '12px 16px'
                    }) as CSSObjectWithLabel,
                  }}
                  placeholder='Select game type...'
                  menuPortalTarget={(typeof window !== 'undefined') ? document.body : null}
                  components={{
                    IndicatorSeparator: null,
                  }}
                  formatOptionLabel={({ label }: {label: string, value: MultiplayerMatchType}) => {
                    const [type, time] = label.split(' ');

                    return (
                      <div className='flex items-center gap-2'>
                        <span className='text-xl'>⚡</span>
                        <div className='flex flex-col'>
                          <span className='font-semibold'>{type}</span>
                          <span className='text-sm opacity-70'>{time}</span>
                        </div>
                      </div>
                    );
                  }}
                  options={options}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
