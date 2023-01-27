import classNames from 'classnames';
import React from 'react';

interface FilterButtonProps {
  element: JSX.Element;
  first?: boolean;
  last?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  selected: boolean;
  transparent?: boolean;
  value: string;
}

export default function FilterButton({ element, first, last, onClick, selected, transparent, value }: FilterButtonProps) {
  return (
    <button
      className={classNames(
        'px-3 py-2.5 text-white font-medium text-xs leading-tight hover:bg-yellow-700 active:bg-yellow-800 transition duration-150 ease-in-out',
        first ? 'rounded-tl-lg rounded-bl-lg' : undefined,
        last ? 'rounded-tr-lg rounded-br-lg' : undefined,
        selected ? (transparent ? 'opacity-30' : 'bg-yellow-800') : 'bg-gray-600',
      )}
      onClick={onClick}
      value={value}
    >
      {element}
    </button>
  );
}
