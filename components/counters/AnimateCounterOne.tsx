import { GameId } from '@root/constants/GameId';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import React, { useEffect, useState } from 'react';
import GameLogo from '../gameLogo';
import { Counter } from './Counter';

interface AnimateCounterOneProps {
    gameId: GameId;
    value: number;
}

export const STREAK_RANK_GROUPS = [
    { min: 0, max: 1, title: "It Begins", emoji: "🌱" },
    { min: 2, max: 4, title: "Getting Comfortable", emoji: "👀" },
    { min: 5, max: 8, title: "Forming Habit", emoji: "🕐" },
    { min: 9, max: 14, title: "Habit Formed", emoji: "✅" },
    { min: 15, max: 22, title: "Routine", emoji: "🔄" },
    { min: 23, max: 29, title: "Hooked", emoji: "🪝" },
    { min: 30, max: 39, title: "Losing Grip", emoji: "🌀" },
    { min: 40, max: 54, title: "All-Consuming", emoji: "🌋" },
    { min: 55, max: 69, title: "Forming Addiction", emoji: "💥" },
    { min: 70, max: 89, title: "Addiction Formed", emoji: "🔥" },
    { min: 90, max: 119, title: "No Turning Back", emoji: "🚫" },
    { min: 120, max: 149, title: "Deeply Bound", emoji: "🕸️" },
    { min: 150, max: 189, title: "Ever Growing", emoji: "🌿" },
    { min: 190, max: 239, title: "Magnetic Force", emoji: "🧲" },
    { min: 240, max: 299, title: "Unshakable", emoji: "🤜" },
    { min: 300, max: 369, title: "Irreversible", emoji: "♾️" },
    { min: 370, max: 449, title: "Inescapable", emoji: "🤯" },
    { min: 450, max: 549, title: "Unbreakable Chain", emoji: "⛓️" },
    { min: 550, max: 649, title: "Endless Spiral", emoji: "🌪️" },
    { min: 650, max: 729, title: "Thinky Lifer", emoji: "🌳" },
    { min: 730, max: Infinity, title: "Never Enough", emoji: "♾️" },
] as const;

/** Helper to find the rank index based on the current streak. */
export function getStreakRankIndex(value: number): number {
    const idx = STREAK_RANK_GROUPS.findIndex(rank => value >= rank.min && value <= rank.max);
    return idx !== -1 ? idx : STREAK_RANK_GROUPS.length - 1;
}

export const AnimateCounterOne: React.FC<AnimateCounterOneProps> = ({ gameId, value }) => {
    const [currentValue, setCurrentValue] = useState(value - 1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showRankUp, setShowRankUp] = useState(false);
    
    // Find current rank info
    const currentRankIndex = getStreakRankIndex(value);
    const currentRank = STREAK_RANK_GROUPS[currentRankIndex];
    const nextRank = STREAK_RANK_GROUPS[currentRankIndex + 1];

    // Check if we're exactly at a rank threshold
    const isExactRank = currentRank.min === value;

    // Handle animations
    useEffect(() => {
        // Start counter animation
        setCurrentValue(value - 1);
        setIsAnimating(true);

        const counterTimeout = setTimeout(() => {
            setCurrentValue(value);
            setIsAnimating(false);
        }, 300);

        // Show rank up animation if at exact rank
        if (isExactRank) {
            setShowRankUp(true);
            const rankTimeout = setTimeout(() => setShowRankUp(false), 2000);
            return () => {
                clearTimeout(counterTimeout);
                clearTimeout(rankTimeout);
            };
        }

        return () => clearTimeout(counterTimeout);
    }, [value, isExactRank]);

    // Calculate progress to next rank
    const progressPercent = nextRank ? Math.min(
        ((value - currentRank.min) / (nextRank.min - currentRank.min)) * 100,
        100
    ) : 100;

    return (
        <div className="flex flex-col gap-2 max-w-sm mx-auto bg-white pt-3 rounded-lg">
            {/* Main Row: Counter + Title + Emoji */}
            <div className="flex items-center gap-1">
                {/* Counter on the left */}
                <div className="font-bold flex text-gray-400 flex-row gap-1 text-xs items-center absolute top-2 left-1/2 -translate-x-1/2">
                    <GameLogo gameId={gameId} id={gameId + 'animate-counter-one'} size={10} />
                    {getGameFromId(gameId).displayName}
                </div>
                <div className={`transition-all duration-700 ${showRankUp ? 'text-green-600' : ''}`}>
                    <Counter value={currentValue} />
                </div>

                <div className='flex flex-col'>
                    
                    {/* Title and Emoji */}
                    <div
                        className={`flex items-center gap-2 text-sm font-medium text-gray-700 transition-all duration-700
            ${showRankUp ? 'text-green-600 font-bold' : ''}
          `}
                    >
                        {currentRank.title}
                        <span className={`text-2xl transition-all duration-300 
            ${isAnimating ? 'scale-125' : ''}
            ${showRankUp ? 'animate-pulse' : ''}
          `}>
                            {currentRank.emoji}
                        </span>
                    </div>
                    {/* Progress Indicator */}
                    {nextRank && (
                        <div className="w-full space-y-0.5">
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-700
                ${showRankUp ? 'bg-green-400' : 'bg-green-500'}`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-500 text-center">
                                Next rank {nextRank.min - value === 1 ? 'tomorrow' : `in ${nextRank.min - value} days`}
                            </div>
                        </div>
                    )}</div>
                    
            </div>
            
        </div>
    );
};