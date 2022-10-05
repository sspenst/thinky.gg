import React from 'react';

interface FormTemplateProps {
  children: JSX.Element;
}

export default function FormTemplate({ children }: FormTemplateProps) {
  return (
    <div className='flex flex-col items-center justify-center'>
      <div
        className='rounded p-3'
        style={{

        }}
      >
        {children}
      </div>
    </div>
  );
}
