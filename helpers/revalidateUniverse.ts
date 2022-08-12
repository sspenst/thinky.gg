import { NextApiResponse } from 'next';
import { logger } from './logger';

export default async function revalidateUniverse(res: NextApiResponse, id: string, revalidateCatalog = true) {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  const promises = [
    //res.revalidate(`/universe/${id}`),
  ];

  if (revalidateCatalog) {
    promises.push(res.revalidate('/catalog/all'));
  }

  try {
    await Promise.all(promises);
  } catch (e) {
    logger.trace(e);

    return false;
  }

  return true;
}
