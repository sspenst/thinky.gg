import classNames from 'classnames';
import React from 'react';
import LevelDataType from '../../constants/levelDataType';
import Theme from '../../constants/theme';
import BlockState from '../../models/blockState';
import styles from './Block.module.css';
import Movable from './movable';

interface BlockProps {
  block: BlockState;
  borderWidth: number;
  onClick: () => void;
  size: number;
}

export default function Block({ block, borderWidth, onClick, size }: BlockProps) {
  const fillCenter = (document.body.classList.contains(Theme.Classic)) && block.type === LevelDataType.Block;
  const innerBorderWidth = Math.round(size / 5);
  const innerSize = size - 2 * borderWidth;

  return (
    <Movable
      borderWidth={borderWidth}
      onClick={onClick}
      position={block.pos}
      size={size}
      transparent={block.inHole}
    >
      <div
        className={'block_type_' + block.type + ' block_movable ' + classNames(block.inHole ? styles['in-hole'] : undefined)}
        style={{
          backgroundColor: fillCenter ? 'var(--level-block-border)' : 'var(--level-block)',
          borderBottomWidth: LevelDataType.canMoveUp(block.type) ? innerBorderWidth : 0,
          borderColor: 'var(--level-block-border)',
          borderLeftWidth: LevelDataType.canMoveRight(block.type) ? innerBorderWidth : 0,
          borderRightWidth: LevelDataType.canMoveLeft(block.type) ? innerBorderWidth : 0,
          borderTopWidth: LevelDataType.canMoveDown(block.type) ? innerBorderWidth : 0,
          height: innerSize,
          width: innerSize,
        }}>
      </div>
    </Movable>
  );
}
