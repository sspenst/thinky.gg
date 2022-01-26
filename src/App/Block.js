import { useEffect, useRef } from 'react';
import './index.css';

export default function Block(props) {
  const blockRef = useRef();

  useEffect(() => {
    // move block to correct spot on window resize or position update
    blockRef.current.style.transform = `
      translateX(${props.squareSize * props.position.x}px)
      translateY(${props.squareSize * props.position.y}px)
    `;
  }, [props.position, props.squareSize]);

  return (
    <div
      style={{
        width: props.squareSize,
        height: props.squareSize,
        position: 'absolute',
        backgroundColor: props.color,
      }}
      className={`animation`}
      ref={blockRef}
    >
    </div>
  );
}
