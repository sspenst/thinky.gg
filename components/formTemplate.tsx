import React from 'react';

interface FormTemplateProps {
  children: JSX.Element;
}

export default function FormTemplate({ children }: FormTemplateProps) {
  return (
    <div className='w-full max-w-xs mx-auto px-4 pt-10 pb-6'>
      <form
        className='shadow-md border rounded px-8 py-6'
        style={{
          background: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-4)',
        }}
      >
        {children}
      </form>
    </div>
  );
}
