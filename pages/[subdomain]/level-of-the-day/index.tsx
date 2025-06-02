import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { getLevelOfDay } from '@root/pages/api/level-of-day';
import { GetServerSidePropsContext } from 'next';
import { getServerSideProps as getServerSidePropsFromLevel } from '../level/[username]/[slugName]';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  // query the current level of the day
  const gameId = getGameIdFromReq(context.req);
  const levelOfDay = await getLevelOfDay(gameId);

  context.params = {
    username: levelOfDay?.userId?.name,
    slugName: levelOfDay?.slug.split('/').pop(),
  };

  return getServerSidePropsFromLevel(context);
}

export { default } from '../level/[username]/[slugName]';
