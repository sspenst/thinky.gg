import React, { useEffect, useRef } from "react";
import './index.css';

export default function Block(props) {
  const blockRef = useRef();

  useEffect(() => {
    // animation reference:
    // https://css-tricks.com/controlling-css-animations-transitions-javascript/
    // https://stackoverflow.com/questions/62570164/dynamic-css-animation-variable-with-react

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
