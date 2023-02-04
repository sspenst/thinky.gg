import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import React from 'react';
import FormattedCampaign, { mustCompletePrevLevel } from '../../components/formattedCampaign';
import Page from '../../components/page';
import getCampaignProps, { CampaignProps } from '../../helpers/getCampaignProps';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import { EnrichedCollection } from '../../models/db/collection';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return await getCampaignProps(reqUser, 'pathology');
}

interface UnlockRequirement {
  disabled: (collections: EnrichedCollection[]) => boolean;
  text: string;
}

/* istanbul ignore next */
export default function PlayPage({ completedLevels, enrichedCollections, totalLevels }: CampaignProps) {
  return (
    <Page title={'Play'}>
      <FormattedCampaign
        completedElement={
          <div className='flex flex-col items-center justify-center text-center mt-2'>
            <div>Congratulations! You&apos;ve completed the official campaign.</div>
            <div>If you&apos;re looking for more levels, try a campaign from the <Link className='font-bold underline' href='/campaigns' passHref>Campaigns</Link> page, or try browsing the <Link className='font-bold underline' href='/search' passHref>Search</Link> page.</div>
            <div>You could also try creating a level of your own on the <Link className='font-bold underline' href='/create' passHref>Create</Link> page.</div>
            <div>We hope you&apos;re enjoying Pathology!</div>
          </div>
        }
        completedLevels={completedLevels}
        enrichedCollections={enrichedCollections}
        title={'Pathology Official Campaign'}
        totalLevels={totalLevels}
        unlockRequirements={{
          'sspenst/02-essence': {
            disabled: (collections: EnrichedCollection[]) => {
              const c1 = collections.find(c => c.slug === 'sspenst/01-learning');

              return c1 && c1.userCompletedCount < 5;
            },
            text: 'Requires completing 5 levels from Learning',
          },
          'sspenst/03-fish-eye': {
            disabled: (collections: EnrichedCollection[]) => {
              const c2 = collections.find(c => c.slug === 'sspenst/02-essence');

              return c2 && c2.userCompletedCount < 5;
            },
            text: 'Requires completing 5 levels from Essence',
          },
          'sspenst/04-holes-intro': {
            disabled: (collections: EnrichedCollection[]) => {
              const c2 = collections.find(c => c.slug === 'sspenst/02-essence');

              return c2 && c2.userCompletedCount < 5;
            },
            text: 'Requires completing 5 levels from Essence',
          },
          'sspenst/05-locks': {
            disabled: (collections: EnrichedCollection[]) => {
              const c2 = collections.find(c => c.slug === 'sspenst/02-essence');

              return c2 && c2.userCompletedCount < 5;
            },
            text: 'Requires completing 5 levels from Essence',
          },
          'sspenst/06-restricted': {
            disabled: (collections: EnrichedCollection[]) => {
              const c4 = collections.find(c => c.slug === 'sspenst/04-holes-intro');
              const c5 = collections.find(c => c.slug === 'sspenst/05-locks');

              return (c4 && c4.userCompletedCount < 3) && (c5 && c5.userCompletedCount < 3);
            },
            text: 'Requires completing 3 levels from Holes Intro and 3 levels from Locks',
          },
          'sspenst/07-precipice-blades': {
            disabled: (collections: EnrichedCollection[]) => {
              const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

              return c6 && c6.userCompletedCount < 7;
            },
            text: 'Requires completing 7 levels from Restricted',
          },
          'sspenst/08-clearing-out': {
            disabled: (collections: EnrichedCollection[]) => {
              const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

              return c6 && c6.userCompletedCount < 7;
            },
            text: 'Requires completing 7 levels from Restricted',
          },
          'sspenst/09-tricks': {
            disabled: (collections: EnrichedCollection[]) => {
              const c4 = collections.find(c => c.slug === 'sspenst/04-holes-intro');
              const c5 = collections.find(c => c.slug === 'sspenst/05-locks');
              const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

              return c4 && c5 && c6 && (c4.userCompletedCount + c5.userCompletedCount + c6.userCompletedCount) < 20;
            },
            text: 'Requires completing 20 levels from Holes Intro, Locks, and Restricted',
          },
          'sspenst/10-out-of-reach': {
            disabled: (collections: EnrichedCollection[]) => {
              const c4 = collections.find(c => c.slug === 'sspenst/04-holes-intro');
              const c5 = collections.find(c => c.slug === 'sspenst/05-locks');
              const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

              return c4 && c5 && c6 && (c4.userCompletedCount + c5.userCompletedCount + c6.userCompletedCount) < 20;
            },
            text: 'Requires completing 20 levels from Holes Intro, Locks, and Restricted',
          },
          'sspenst/11-pipelining': {
            disabled: (collections: EnrichedCollection[]) => {
              const c4 = collections.find(c => c.slug === 'sspenst/04-holes-intro');
              const c5 = collections.find(c => c.slug === 'sspenst/05-locks');
              const c6 = collections.find(c => c.slug === 'sspenst/06-restricted');

              return c4 && c5 && c6 && (c4.userCompletedCount + c5.userCompletedCount + c6.userCompletedCount) < 20;
            },
            text: 'Requires completing 20 levels from Holes Intro, Locks, and Restricted',
          },
          'sspenst/12-exam': {
            disabled: (collections: EnrichedCollection[]) => {
              const c6 = collections.find(c => c.slug === 'sspenst/09-tricks');
              const c7 = collections.find(c => c.slug === 'sspenst/10-out-of-reach');
              const c8 = collections.find(c => c.slug === 'sspenst/11-pipelining');

              return c6 && c7 && c8 && (c6.userCompletedCount + c7.userCompletedCount + c8.userCompletedCount) < 25;
            },
            text: 'Requires completing 25 levels from Tricks, Out of Reach, and Pipelining',
          },
          'cosmovibe/2-tuna-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/1-salmon-eye'),
          'cosmovibe/3-mackerel-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/2-tuna-eye'),
          'cosmovibe/4-yellowtail-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/3-mackerel-eye'),
          'cosmovibe/5-squid-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/4-yellowtail-eye'),
          'cosmovibe/6-flounder-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/5-squid-eye'),
          'cosmovibe/7-herring-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/6-flounder-eye'),
          'cosmovibe/8-shark-eye': mustCompletePrevLevel('sspenst/03-fish-eye', 'cosmovibe/7-herring-eye'),
          'hi19hi19/precipice-blade-2': mustCompletePrevLevel('sspenst/07-precipice-blades', 'hi19hi19/precipice-blade'),
          'hi19hi19/precipice-blade-3': mustCompletePrevLevel('sspenst/07-precipice-blades', 'hi19hi19/precipice-blade-2'),
          'hi19hi19/clearing-out-2': mustCompletePrevLevel('sspenst/08-clearing-out', 'hi19hi19/clearing-out'),
          'hi19hi19/clearing-out-3': mustCompletePrevLevel('sspenst/08-clearing-out', 'hi19hi19/clearing-out-2'),
          'hi19hi19/clearing-out-4': mustCompletePrevLevel('sspenst/08-clearing-out', 'hi19hi19/clearing-out-3'),
          'hi19hi19/clearing-out-5': mustCompletePrevLevel('sspenst/08-clearing-out', 'hi19hi19/clearing-out-4'),
        } as { [slug: string]: UnlockRequirement }}
      />
    </Page>
  );
}
