import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React, { useState } from 'react';
import DeleteLevelModal from '../../components/modal/deleteLevelModal';
import EditLevelModal from '../../components/modal/editLevelModal';
import PublishLevelModal from '../../components/modal/publishLevelModal';
import Page from '../../components/page';
import SelectCard from '../../components/selectCard';
import Dimensions from '../../constants/dimensions';
import { getUserFromToken } from '../../lib/withAuth';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const levels = await LevelModel.find<Level>({
    isDeleted: { $ne: true },
    isDraft: true,
    userId: reqUser._id,
  }).sort({ name: 1 });

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
    },
  };
}

interface CreateProps {
  levels: Level[];
}

/* istanbul ignore next */
export default function Create({ levels }: CreateProps) {
  const [isDeleteLevelOpen, setIsDeleteLevelOpen] = useState(false);
  const [isEditLevelOpen, setIsEditLevelOpen] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [levelToModify, setLevelToModify] = useState<Level>();

  return (
    <Page title={'Create'}>
      <div className='flex flex-col gap-5 m-5 items-center'>
        <div className='text-center'>
          Welcome to the Create page! Here you can create new levels and make changes to your draft levels. Once you have finished creating your level, click &apos;Test&apos; to set the level&apos;s least steps, then click &apos;Publish&apos; to make your level available for everyone to play. You can unpublish or archive a level at any time.
        </div>
        <div>
          <Link
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer block'
            href='/new'
          >
            New Level
          </Link>
        </div>
        <div className='flex flex-wrap justify-center gap-y-4'>
          {levels.map(level => {
            return (
              <div
                className='flex flex-col'
                key={`draft-level-${level._id.toString()}`}
              >
                <SelectCard
                  option={{
                    hideDifficulty: true,
                    height: Dimensions.OptionHeightMedium,
                    href: `/edit/${level._id.toString()}`,
                    id: level._id.toString(),
                    level: level,
                    stats: level.leastMoves ? new SelectOptionStats(level.leastMoves, level.leastMoves) : undefined,
                    text: level.name,
                  } as SelectOption}
                />
                <div className='flex flex-row gap-4 justify-center'>
                  {level.leastMoves ?
                    <button
                      className='italic underline'
                      onClick={() => {
                        setLevelToModify(level);
                        setIsPublishLevelOpen(true);
                      }}
                    >
                      Publish
                    </button>
                    :
                    <Link
                      className='italic underline'
                      href={`/test/${level._id.toString()}`}
                    >
                      Test
                    </Link>
                  }
                  <button
                    className='italic underline'
                    onClick={() => {
                      setLevelToModify(level);
                      setIsEditLevelOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className='italic underline'
                    onClick={() => {
                      setLevelToModify(level);
                      setIsDeleteLevelOpen(true);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {!levelToModify ? null : <>
          <PublishLevelModal
            closeModal={() => setIsPublishLevelOpen(false)}
            isOpen={isPublishLevelOpen}
            level={levelToModify}
          />
          <EditLevelModal
            closeModal={() => setIsEditLevelOpen(false)}
            isOpen={isEditLevelOpen}
            level={levelToModify}
          />
          <DeleteLevelModal
            closeModal={() => setIsDeleteLevelOpen(false)}
            isOpen={isDeleteLevelOpen}
            level={levelToModify}
          />
        </>}
      </div>
    </Page>
  );
}
