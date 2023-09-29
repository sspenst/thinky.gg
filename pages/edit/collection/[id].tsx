import { getCollection2 } from '@root/pages/api/collection-by-id/[id]';
import { Types } from 'mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import nProgress from 'nprogress';
import React from 'react';
import toast from 'react-hot-toast';
import Select from '../../../components/cards/select';
import LinkInfo from '../../../components/formatted/linkInfo';
import Page from '../../../components/page/page';
import Dimensions from '../../../constants/dimensions';
import { getUserFromToken } from '../../../lib/withAuth';
import Collection from '../../../models/db/collection';
import { EnrichedLevel } from '../../../models/db/level';
import User from '../../../models/db/user';
import SelectOption from '../../../models/selectOption';
import SelectOptionStats from '../../../models/selectOptionStats';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const { id } = context.query;

  if (!reqUser || typeof id !== 'string') {
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  const collection = await getCollection2({ $match: {
    _id: new Types.ObjectId(id as string),
    userId: reqUser._id,
  } }, reqUser, false);

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

/* istanbul ignore next */
export default function CollectionEdit({ collection, reqUser }: CollectionEditProps) {
  const levels = collection.levels as EnrichedLevel[];
  const showAuthor = levels.some(level => level.userId._id !== collection.userId._id);
  const options = levels.map(level => {
    return {
      author: showAuthor ? level.userId.name : undefined,
      height: showAuthor ? Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
      href: level.isDraft ? `/edit/${level._id.toString()}` : `/level/${level._id.toString()}`,
      id: level._id.toString(),
      level: level,
      stats: new SelectOptionStats(level.leastMoves, level.userMoves),
      text: level.name,
    } as SelectOption;
  });

  const onChange = function(updatedItems: SelectOption[]) {
    nProgress.start();

    fetch(`/api/collection/${collection._id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        levels: updatedItems.map(option => option.id),
      }),
    }).then(async res => {
      if (res.status !== 200) {
        throw res.text();
      }
    }).catch(err => {
      console.trace(err);
      toast.dismiss();
      toast.error('Error updating collection');
    }).finally(() => {
      nProgress.done();
    });
  };

  return (
    <Page
      folders={[
        new LinkInfo(reqUser.name, `/profile/${reqUser.name}/collections`),
        new LinkInfo(collection.name, `/collection/${collection.slug}`),
      ]}
      title={'Reorder'}
    >
      <>
        <div className='flex items-center justify-center pt-3'>
          <h1>Drag to reorder <span className='font-bold'>{collection?.name}</span></h1>
        </div>
        <Select onChange={onChange} options={options} prefetch={false} />
      </>
    </Page>
  );
}
