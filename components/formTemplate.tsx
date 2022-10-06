import React from 'react';

interface FormTemplateProps {
  children: JSX.Element;
}

export default function FormTemplate({ children }: FormTemplateProps) {
  return (
    <div className='w-full max-w-sm mx-auto px-4 py-6'>
      <div
        className='shadow-md border rounded px-8 py-6'
        style={{
          background: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-4)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
