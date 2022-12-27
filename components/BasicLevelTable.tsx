import Link from 'next/link';
import React from 'react';
import getProfileSlug from '../helpers/getProfileSlug';
import { EnrichedLevel } from '../models/db/level';
import { getFormattedDifficulty } from './difficultyDisplay';
import EnrichedLevelLink from './enrichedLevelLink';

export default function BasicLevelTable({ title, levels }: {title: string, levels: EnrichedLevel[]}) {
  return <div><h2 className='font-bold text-lg text-center'>{title}</h2>
    <table cellSpacing={0} cellPadding={0} className='text-sm rounded table-auto border-0 items-center justify-center mx-auto p-0 border-0'>
      <thead>
        <tr className='border-0'>
          <th className='text-left border-0'>Level</th>
          <th className='text-left border-0'>Difficulty</th>
          <th className='text-left border-0'>Rating</th>
        </tr>
      </thead>
      <tbody>
        {levels.map(level => {
          return (
            <tr key={`level-${level._id.toString()}`} className='border-0'>
              <td className='border-0'>
                <div className='flex items-center gap-1 mr-2'>
                  <EnrichedLevelLink level={level} /> by {level.userId ? (
                    <Link className='italic underline' href={getProfileSlug(level.userId)}>
                      {level.userId.name}
                    </Link>
                  ) : (
                    <span>Unknown</span>
                  )}
                </div>
              </td>
              <td className='border-0'>
                {getFormattedDifficulty(level.calc_difficulty_estimate, level.calc_playattempts_unique_users_count)}
              </td>
              <td className='border-0'>
                <div>
                  {level.calc_reviews_score_laplace.toFixed(2)}
                </div>
              </td>
            </tr>
          );
        })
        }
      </tbody>
    </table>
  </div>;
}
