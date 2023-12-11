import HomeDefaultPathology from '@root/components/homepage/pathology/homeDefaultPathology';
import TutorialPathology from '@root/components/homepage/pathology/tutorialPathology';
import HomeDefaultSokoban from '@root/components/homepage/sokoban/homeDefaultSokoban';
import TutorialSokobon from '@root/components/homepage/sokoban/tutorialSokoban';
import { GameId } from '@root/constants/GameId';
import { Game } from '@root/constants/Games';
import ThinkyHomePage from '@root/pages';
import React from 'react';

export default function getHomeDefault(game: Game) {
  switch (game.id) {
  case GameId.THINKY:
    return <ThinkyHomePage />;
  case GameId.PATHOLOGY:
    return <HomeDefaultPathology />;
  case GameId.SOKOBAN:
    return <HomeDefaultSokoban />;
  default:
    return <ThinkyHomePage />;
  }
}

export function getTutorialComponent(game: Game) {
  switch (game.id) {
  case GameId.THINKY:
    return <TutorialPathology />;
  case GameId.PATHOLOGY:
    return <TutorialPathology />;
  case GameId.SOKOBAN:
    return <TutorialSokobon />;
  default:
    return <TutorialPathology />;
  }
}
