import { Game } from '@root/constants/Games';
import * as PImage from 'pureimage';
import { PassThrough } from 'stream';
import Dimensions from '../constants/dimensions';
import Level from '../models/db/level';
import generateLevelCanvas from './generateLevelCanvas';

export default async function getPngDataServer(game: Game, level: Level | {data: string}): Promise<Buffer> {
  let canvas = PImage.make(Dimensions.LevelCanvasWidth, Dimensions.LevelCanvasHeight);

  canvas = generateLevelCanvas(canvas, game, level.data) as PImage.Bitmap;

  const stream = new PassThrough();
  const chunks: Uint8Array[] = [];
  const encodePromise = PImage.encodePNGToStream(canvas, stream);

  return await new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', err => reject(err));
    stream.on('end', async () => {
      await encodePromise;
      resolve(Buffer.concat(chunks));
    });
  });
}
