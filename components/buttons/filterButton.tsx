import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext } from 'react';
import { toast } from 'react-hot-toast';

interface FilterButtonProps {
  element: JSX.Element | string;
  first?: boolean;
  last?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  proRequired?: boolean;
  selected: boolean;
  transparent?: boolean;
  value: string;
}

export default function FilterButton({ element, first, last, onClick, proRequired, selected, transparent, value }: FilterButtonProps) {
  const { user } = useContext(AppContext);
  const proDisabled = !isPro(user) && proRequired;

  return (
    <button
      className={classNames(
        'px-3 py-2.5 font-medium text-xs leading-tight active:bg-yellow-800 transition duration-150 ease-in-out',
        first ? 'rounded-tl-lg rounded-bl-lg' : undefined,
        last ? 'rounded-tr-lg rounded-br-lg' : undefined,
        selected ? (transparent ? 'opacity-30' : 'bg-yellow-800') : 'bg-green-100 hover:bg-yellow-700 dark:bg-gray-600 hover:dark:bg-yellow-700',
        proDisabled ? 'cursor-not-allowed' : undefined,
      )}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!proDisabled) {
          onClick(e);
        } else {
          toast.dismiss();
          toast.error(
            <div className='text-lg'>
              Requires <Link href='/settings/pro' className='text-blue-500'>Pathology Pro</Link>
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
