import Link from 'next/link';
import React from 'react';

interface QuickActionButtonProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  subtitle?: string;
  disabled?: boolean;
  className?: string;
}

export default function QuickActionButton({ href, icon, text, subtitle, disabled, className = '' }: QuickActionButtonProps) {
  const baseClasses = 'flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition h-[100px] w-full';
  const disabledClasses = 'bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed';
  const classes = `${baseClasses} ${disabled ? disabledClasses : ''} ${className}`;

  const content = (
    <>
      <span className='text-xl mb-1'>{icon}</span>
      <span className='text-sm font-medium'>{text}</span>
      {subtitle && (
        <span className='text-xs text-gray-500 dark:text-gray-400'>
          {subtitle}
        </span>
      )}
    </>
  );

  if (disabled) {
    return (
      <div className={classes}>
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
