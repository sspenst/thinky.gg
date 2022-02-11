import './index.css';
import { useEffect, useRef, useState } from 'react';
import Color from '../Constants/Color';
import LevelDataHelper from '../Helpers/LevelDataHelper';

export default function Block(props) {
  const blockRef = useRef();
  const fontSize = props.size * 0.5;
  const borderWidth = props.size * 0.2;

  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(props.position.clone());

  useEffect(() => {
    // move block to correct spot on window resize or position update
    blockRef.current.style.transform = `
      translateX(${(props.position.x - initPos.x) * 100}%)
      translateY(${(props.position.y - initPos.y) * 100}%)
    `;
  }, [initPos, props.position]);

  return (
    <div
      style={{
        width: props.size,
        height: props.size,
        position: 'absolute',
        left: props.size * initPos.x,
        top: props.size * initPos.y,
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
      className={`font-semibold animation cursor-default select-none`}
      ref={blockRef}
    >
      {props.text}
    </div>
  );
}
