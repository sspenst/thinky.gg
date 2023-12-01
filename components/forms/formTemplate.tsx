import React from 'react';

interface FormTemplateProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function FormTemplate({ children, style }: FormTemplateProps) {
  return (
    <div className='w-full max-w-md mx-auto px-4 my-6'>
      <div
        className='shadow-md border rounded-lg px-8 py-6'
        style={{
          background: 'var(--bg-color-2)',
          borderColor: 'var(--bg-color-4)',
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
