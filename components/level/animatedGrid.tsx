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

const AnimatedGrid = React.memo(function AnimatedGrid({ animationInstructions, id, game, theme, leastMoves, levelData }: AnimatedGridProps) {
  const [gameState, setGameState] = useState(initGameState(levelData));
  const gameStateRef = useRef(gameState);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationIndexRef = useRef<number>(0);
  const waitTimeRef = useRef<number>(200);

  // Update the ref when gameState changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    animationIndexRef.current = 0;
    lastTimeRef.current = 0;
    waitTimeRef.current = 200;
    setGameState(initGameState(levelData));

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastTimeRef.current;

      // Only proceed if enough time has passed
      if (elapsed >= waitTimeRef.current) {
        const currentMove = animationInstructions[animationIndexRef.current];

        if (currentMove === Direction.NONE) {
          // reset
          setGameState(initGameState(levelData));
        } else {
          makeMove(gameStateRef.current, currentMove);
          setGameState({ ...gameStateRef.current });
        }

        animationIndexRef.current++;

        if (animationIndexRef.current < animationInstructions.length) {
          // check if the next move is a reset, if it is we want to wait a bit longer before executing it
          const nextMove = animationInstructions[animationIndexRef.current];
          const wait = nextMove === Direction.NONE ? 1000 : 120;

          // Use more predictable timing without random variation for better performance
          waitTimeRef.current = wait;

          if (currentMove === nextMove) {
            // make it faster if it's the same move
            waitTimeRef.current /= 2;
          }
        } else {
          animationIndexRef.current = 0;
          waitTimeRef.current = 500;
        }

        lastTimeRef.current = timestamp;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation after initial delay
    const timeoutId = setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(animate);
    }, 200);

    return () => {
      clearTimeout(timeoutId);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animationInstructions, levelData]);

  return <Grid id={id || game.id + '-animated'} leastMoves={leastMoves || 0} gameOverride={game} themeOverride={theme} gameState={gameState} />;
});

export default AnimatedGrid;
