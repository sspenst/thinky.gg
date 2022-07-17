import React, { useContext } from 'react';
import { LayoutContext } from '../../contexts/layoutContext';
import { PageContext } from '../../contexts/pageContext';

interface LayoutContainerProps {
  children: JSX.Element;
  height?: number;
  width?: number;
}

export default function LayoutContainer({ children, height, width }: LayoutContainerProps) {
  const { windowSize } = useContext(PageContext);

  return (
    <LayoutContext.Provider value={{
      layoutHeight: height,
    }}>
      <div
        id='layout-container'
        style={{
          height: height ? height : windowSize.height,
          width: width ? width : windowSize.width,
        }}
      >
        {children}
      </div>
    </LayoutContext.Provider>
  );
}
