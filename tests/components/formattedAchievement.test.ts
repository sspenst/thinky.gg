import FormattedAchievement from '@root/components/formatted/formattedAchievement';
import AchievementType from '@root/constants/achievements/achievementType';
import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function expectFixedBelow(markup: string, tooltipId: string) {
  expect(markup).toContain(
    `data-tooltip-id="${tooltipId}" data-tooltip-place="bottom" data-tooltip-position-strategy="fixed"`,
  );
}

describe('FormattedAchievement', () => {
  it('keeps unlocked and description tooltips below the fixed header', () => {
    const achievementType = AchievementType.CREATOR_CREATED_25_HIGH_QUALITY_LEVELS;
    const markup = renderToStaticMarkup(createElement(FormattedAchievement, {
      achievementType,
      game: Games[GameId.PATHOLOGY],
      unlocked: true,
    }));

    expectFixedBelow(markup, `unlocked-tooltip-${achievementType}`);
    expectFixedBelow(markup, `achievement-description-${achievementType}`);
  });

  it('keeps the secret tooltip below the fixed header', () => {
    const achievementType = AchievementType.WELCOME;
    const markup = renderToStaticMarkup(createElement(FormattedAchievement, {
      achievementType,
      game: Games[GameId.PATHOLOGY],
      unlocked: true,
    }));

    expectFixedBelow(markup, `secret-tooltip-${achievementType}`);
  });
});
