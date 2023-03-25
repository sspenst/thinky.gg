import classNames from 'classnames';
import Link from 'next/link';
import React from 'react';
import { toast } from 'react-hot-toast';

interface FilterButtonProps {
  disabled?: boolean;
  element: JSX.Element;
  first?: boolean;
  last?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  selected: boolean;
  transparent?: boolean;
  value: string;
}

export default function FilterButton({ disabled, element, first, last, onClick, selected, transparent, value }: FilterButtonProps) {
  return (
    <button
      className={classNames(
        'px-3 py-2.5 text-white font-medium text-xs leading-tight hover:bg-yellow-700 active:bg-yellow-800 transition duration-150 ease-in-out',
        first ? 'rounded-tl-lg rounded-bl-lg' : undefined,
        last ? 'rounded-tr-lg rounded-br-lg' : undefined,
        selected ? (transparent ? 'opacity-30' : 'bg-yellow-800') : 'bg-gray-600',
        disabled ? 'cursor-not-allowed' : undefined,
      )}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled) {
          onClick(e);
        } else {
          toast.dismiss();
          toast.error(
            <div className='flex flex-col'>
              <div>This feature is not available in your current plan.</div>
              <div>Upgrade to a <Link href='/settings/proaccount' className='text-blue-500'>Pro Account</Link> to unlock.</div>
            </div>,
            {
              duration: 5000,
              icon: '🔒',
            }
          );
        }
      }}
      value={value}
    >
      {element}
    </button>
  );
}
