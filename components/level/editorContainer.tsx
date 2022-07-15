import React, { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';

interface EditorContainerProps {
  children: JSX.Element;
}

export default function EditorContainer({ children }: EditorContainerProps) {
  const { windowSize } = useContext(PageContext);

  return (
    <div id='editor-container' style={{
      height: windowSize.height - Dimensions.EditorBlockHeight,
      width: windowSize.width,
    }}>
      {children}
    </div>
  );
}
