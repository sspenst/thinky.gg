import Direction from '@root/constants/direction';
import { Game } from '@root/constants/Games';
import Theme from '@root/constants/theme';
import { initGameState, makeMove } from '@root/helpers/gameStateHelpers';
import React, { useEffect, useRef, useState } from 'react';
import Grid from './grid';

interface AnimatedGridProps {
    animationInstructions: Direction[];
    id?: string;
    game: Game;
    theme: Theme;
    leastMoves?: number;
    levelData: string;

}

export default function AnimatedGrid({ animationInstructions, id, game, theme, leastMoves, levelData }: AnimatedGridProps) {
  const [gameState, setGameState] = useState(initGameState(levelData));
  const gameStateRef = useRef(gameState);

  // Update the ref when gameState changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    let animationIndex = 0;

    setGameState(initGameState(levelData));
    let timer: NodeJS.Timeout;
    const act = () => {
      if (animationInstructions[animationIndex] === Direction.NONE) {
        // reset
        setGameState(initGameState(levelData));
      } else {
        makeMove(gameStateRef.current, animationInstructions[animationIndex]);
        setGameState({ ...gameStateRef.current });
      }

      animationIndex++;
      let waitPlusSomeVariation = 500;

      if (animationIndex < animationInstructions.length) {
        // check if the next move is a reset, if it is we want to wait a bit longer before executing it
        const nextMove = animationInstructions[animationIndex];
        const wait = nextMove === Direction.NONE ? 1000 : 100;

        waitPlusSomeVariation = wait + Math.random() * 150;
      } else {
        animationIndex = 0;
      }

      timer = setTimeout(act, waitPlusSomeVariation);
    };

    timer = setTimeout(act, 200);

    return () => clearTimeout(timer);
  }, [animationInstructions, levelData]);

  return <Grid id={id || game.id + '-animated'} leastMoves={leastMoves || 0} gameOverride={game} themeOverride={theme} gameState={gameState} />;
}
