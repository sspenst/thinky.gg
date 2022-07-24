import { NextApiRequest, NextApiResponse } from 'next';
import { ImageModel } from '../../../models/mongoose';
import dbConnect from '../../../lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  if (!req.query) {
    res.status(400).send('Missing required parameters');

    return;
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      error: 'Missing required parameters',
    });
  }

  // strip .png from id
  const userId = (id.toString()).replace(/\.png$/, '');

  await dbConnect();

  const image = await ImageModel.findOne({ documentId: userId });

  console.log(image);

  // console.log(image);

  if (image) {

    // const dataURL = Buffer.from(image.image, 'base64url');

    // console.log(dataURL);

    // console.log(image.image);

    // image.image.to

    // console.log(dataURL);

    // const contentType = dataURL.substring(dataURL.indexOf(':') + 1, dataURL.indexOf(';'));
    // const base64 = dataURL.substring(dataURL.indexOf(',') + 1);

    // const data = Buffer.from(base64, 'base64').toString();

    // console.log(contentType);
    // console.log(data);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', image.image.length);
    // // set cache for 2 weeks
    // res.setHeader('Cache-Control', 'public, max-age=1209600');
    // res.setHeader('Expires', new Date(Date.now() + 1209600000).toUTCString());

    res.status(200).send(image.image);

    return;
  }

  return res.status(200).send(null);
}
