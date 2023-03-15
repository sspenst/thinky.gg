import React from 'react';

interface FormTemplateProps {
  children: JSX.Element;
  style?: React.CSSProperties;
}

export default function FormTemplate({ children, style }: FormTemplateProps) {
  return (
    <div className='flex justify-center items-center p-3' style={{
      ...style,
    }}>

      {children}

    </div>
  );
}
