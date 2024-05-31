import LevelCard from '@root/components/cards/levelCard';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { redirectToLogin } from '@root/helpers/redirectToLogin';
import { getCollection } from '@root/pages/api/collection-by-id/[id]';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import nProgress from 'nprogress';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import LinkInfo from '../../../../components/formatted/linkInfo';
import Page from '../../../../components/page/page';
import Dimensions from '../../../../constants/dimensions';
import { getUserFromToken } from '../../../../lib/withAuth';
import Collection from '../../../../models/db/collection';
import { EnrichedLevel } from '../../../../models/db/level';
import User from '../../../../models/db/user';
import SelectOption from '../../../../models/selectOption';
import SelectOptionStats from '../../../../models/selectOptionStats';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const { id } = context.query;
  const gameId = getGameIdFromReq(context.req);

  if (!reqUser || typeof id !== 'string') {
    return redirectToLogin(context);
  }

  const collection = await getCollection({
    includeDraft: true,
    matchQuery: {
      _id: new Types.ObjectId(id as string),
      userId: reqUser._id,
      gameId: gameId,
    },
    reqUser,
  });

  if (!collection) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      collection: JSON.parse(JSON.stringify(collection)),
      reqUser: JSON.parse(JSON.stringify(reqUser)),
    } as CollectionEditProps,
  };
}

interface CollectionEditProps {
  collection: Collection;
  reqUser: User;
}

export default function CollectionEdit({ collection, reqUser }: CollectionEditProps) {
  const [options, setOptions] = useState(
    collection.levels.map((level: EnrichedLevel) => {
      return {
        author: level.userId.name,
        height: Dimensions.OptionHeightLarge,
        href: level.isDraft ? `/edit/${level._id.toString()}` : `/level/${level._id.toString()}`,
        id: level._id.toString(),
        level: level,
        stats: new SelectOptionStats(level.leastMoves, level.userMoves),
        text: level.name,
      } as SelectOption;
    })
  );

  const onChange = (updatedItems: SelectOption[]) => {
    nProgress.start();

    fetch(`/api/collection/${collection._id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        levels: updatedItems.map((option) => option.id),
      }),
    })
      .then(async (res) => {
        if (res.status !== 200) {
          toast.dismiss();
          toast.error('Error updating collection');
        }
      })
      .catch((err) => {
        console.trace(err);
        toast.dismiss();
        toast.error('Error updating collection');
      })
      .finally(() => {
        nProgress.done();
      });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOptions = [...options];
    const [movedItem] = newOptions.splice(index, 1);

    newOptions.splice(direction === 'up' ? index - 1 : index + 1, 0, movedItem);
    setOptions(newOptions);
    onChange(newOptions);
  };

  const updateOrder = (index: number, newPosition: number) => {
    const newOptions = [...options];
    const [movedItem] = newOptions.splice(index, 1);

    newOptions.splice(newPosition, 0, movedItem);
    setOptions(newOptions);
    onChange(newOptions);
  };

  return (
    <Page
      folders={[
        new LinkInfo(reqUser.name, `/profile/${reqUser.name}/collections`),
        new LinkInfo(collection.name, `/collection/${collection.slug}`),
      ]}
      title={'Reorder'}
    >
      <div className='flex items-center pt-3 justify-center'>
        <h1 className='text-2xl'>
          Reorder levels in the <span className='font-bold'>{collection?.name}</span> collection
        </h1>
      </div>
      <div className='flex flex-col gap-1 p-6'>
        {options.length > 0 ? (
          options.map((option, index) => (
            <div key={option.id} className='flex items-center gap-1'>
              <div className='flex flex-row'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='16'
                  height='16'
                  fill='currentColor'
                  className={'bi bi-arrow-up ' + (index === 0 && 'invisible')}
                  viewBox='0 0 16 16'
                  onClick={() => index > 0 && moveItem(index, 'up')}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    fillRule='evenodd'
                    d='M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5'
                  />
                </svg>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='16'
                  height='16'
                  fill='currentColor'
                  className={'bi bi-arrow-down ' + (index === options.length - 1 && 'invisible')}
                  viewBox='0 0 16 16'
                  onClick={() => index < options.length - 1 && moveItem(index, 'down')}
                  style={{ cursor: 'pointer' }}
                >
                  <path
                    fillRule='evenodd'
                    d='M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1'
                  />
                </svg>
              </div>
              <div className='flex items-center gap-16'>
                <input
                  type='text'
                  placeholder={`${index + 1}`}
                  className='w-16 text-center'
                  onChange={(e) => {
                    const newPosition = Number(e.target.value) - 1;

                    if (newPosition >= 0 && newPosition < options.length) {
                      updateOrder(index, newPosition);
                    }
                  }}
                />
                {option.level && <LevelCard id={option.id} level={option.level} />}
              </div>
            </div>
          ))
        ) : (
          <div className='flex items-center justify-center gap-1'>
            <div>No levels found</div>
          </div>
        )}
      </div>
    </Page>
  );
}
