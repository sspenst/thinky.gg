import { NextApiResponse } from 'next';
import revalidateUrl from './revalidateUrl';

export default async function revalidateLevel(res: NextApiResponse, slugName: string) {
  return await revalidateUrl(res, `/level/${slugName}`);
}
