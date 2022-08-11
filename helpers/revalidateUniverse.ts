import { NextApiResponse } from 'next';

export default async function revalidateUniverse(res: NextApiResponse, id: string, revalidateCatalog = true) {
  const promises = [
    //res.revalidate(`/universe/${id}`),
  ];

  if (revalidateCatalog) {
    promises.push(res.revalidate('/catalog/all'));
  }

  try {
    await Promise.all(promises);
  } catch (e) {
    console.trace(e);

    return false;
  }

  return true;
}
