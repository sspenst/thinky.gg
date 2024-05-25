import React from 'react';

interface FormTemplateProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
}

export default function FormTemplate({ children, style, title }: FormTemplateProps) {
  return (
    <div className='w-full max-w-lg mx-auto px-4 my-12'>
      <div
        className='shadow-md bg-1 border border-color-3 rounded-xl px-10 py-8 flex flex-col gap-6'
        style={style}
      >
        {title &&
          <span className='font-semibold text-xl'>
            {title}
          </span>
        }
        {children}
      </div>
    </div>
  );
}
