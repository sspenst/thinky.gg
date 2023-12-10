import HomeDefaultPathology from '@root/components/homepage/pathology/homeDefaultPathology';
import HomeDefaultSokoban from '@root/components/homepage/sokoban/homeDefaultSokoban';
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
