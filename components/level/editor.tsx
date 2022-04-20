import React, { useState } from 'react';
import BlockState from '../../models/blockState';
import Control from '../../models/control';
import GameLayout from './gameLayout';
import { GameState } from './game';
import Level from '../../models/db/level';
import LevelDataType from '../../constants/levelDataType';
import Position from '../../models/position';
import SquareState from '../../models/squareState';

export default function Editor() {
  const defaultSize = 10;
  const [gameState] = useState({
    blocks: [] as BlockState[],
    board: Array(defaultSize).fill(undefined).map(() =>
    new Array(defaultSize).fill(undefined).map(() =>
      new SquareState())),
    moveCount: 0,
    pos: new Position(0, 0),
  } as GameState);
  const [level] = useState({
    data: Array(defaultSize * defaultSize).fill('0'),
    height: defaultSize,
    width: defaultSize,
  } as unknown as Level);
  const [, setLevelDataType] = useState(LevelDataType.Default);

  return (
    <GameLayout
      controls={[
        new Control(() => setLevelDataType(LevelDataType.Default), 'Default'),
        new Control(() => setLevelDataType(LevelDataType.Wall), 'Wall'),
      ]}
      gameState={gameState}
      level={level}
    />
  );
}
