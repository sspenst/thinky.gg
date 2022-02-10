import './index.css';
import { useEffect, useRef } from 'react';
import Color from '../Constants/Color';
import LevelDataHelper from '../Helpers/LevelDataHelper';

export default function Block(props) {
  const blockRef = useRef();
  const fontSize = props.size * 0.5;
  const borderWidth = props.size * 0.2;

  useEffect(() => {
    // move block to correct spot on window resize or position update
    blockRef.current.style.transform = `
      translateX(${props.size * props.position.x}px)
      translateY(${props.size * props.position.y}px)
    `;
  }, [props.position, props.size]);

  return (
    <div
      style={{
        width: props.size,
        height: props.size,
        position: 'absolute',
        backgroundColor: props.color,
        textAlign: 'center',
        verticalAlign: 'middle',
        lineHeight: props.size + 'px',
        fontSize: fontSize,
        color: props.textColor,
        borderColor: Color.BlockBorder,
        borderLeftWidth: LevelDataHelper.canMoveRight(props.type) ? borderWidth : 0,
        borderTopWidth: LevelDataHelper.canMoveDown(props.type) ? borderWidth : 0,
        borderRightWidth: LevelDataHelper.canMoveLeft(props.type) ? borderWidth : 0,
        borderBottomWidth: LevelDataHelper.canMoveUp(props.type) ? borderWidth : 0,
      }}
      className={`font-semibold animation`}
      ref={blockRef}
    >
      {props.text}
    </div>
  );
}
