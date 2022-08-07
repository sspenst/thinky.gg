import * as PImage from 'pureimage';
import { Bitmap } from 'pureimage/types/bitmap';
import { PassThrough } from 'stream';
import Dimensions from '../constants/dimensions';
import Level from '../models/db/level';
import generateLevelCanvas from './generateLevelCanvas';

export default async function getPngDataServer(level: Level) {
  let canvas = PImage.make(Dimensions.LevelCanvasWidth, Dimensions.LevelCanvasHeight, {});

  canvas = generateLevelCanvas(canvas, level) as Bitmap;

  const stream = new PassThrough();

  await PImage.encodePNGToStream(canvas, stream);

  return await stream.read();
}
