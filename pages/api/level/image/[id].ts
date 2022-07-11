import * as PImage from 'pureimage';
import { LevelImageModel, LevelModel } from '../../../../models/mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
import Level from '../../../../models/db/level';
import LevelDataType from '../../../../constants/levelDataType';
import { ObjectId } from 'bson';
import { PassThrough } from 'stream';
import dbConnect from '../../../../lib/dbConnect';
import getTs from '../../../../helpers/getTs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
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

    await dbConnect();

    let level: Level | null;

    try {
      level = await LevelModel.findOne<Level>({
        _id: id,
      });
    } catch {
      return res.status(400).json({
        error: 'Invalid id format',
      });
    }

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    if (level.isDraft) {
      return res.status(401).json({
        error: 'Level is not published',
      });
    }

    const levelImage = await LevelImageModel.findOne({ levelId: id });

    if (levelImage) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', levelImage.image.length);
      res.status(200).send(levelImage.image);

      return;
    }

    const width = 1200;
    const height = 630;
    const cellSize = level.width / level.height > width / height ?
      Math.floor(width / level.width) : Math.floor(height / level.height);
    const xOffset = Math.floor((width - level.width * cellSize) / 2);
    const yOffset = Math.floor((height - level.height * cellSize) / 2);
    const cellMargin = Math.round(cellSize / 40) || 1;
    const borderWidth = Math.round(cellSize / 5);

    const canvas = PImage.make(width, height, {});
    const context = canvas.getContext('2d');

    context.imageSmoothingEnabled = false;
    context.fillStyle = 'rgb(38, 38, 38)';
    context.fillRect(0, 0, width, height);

    const levelData = level.data.split('\n');

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const levelDataType = levelData[y][x] as LevelDataType;

        switch (levelDataType) {
        case LevelDataType.Default:
          context.fillStyle = 'rgb(14, 168, 117)';
          break;
        case LevelDataType.Wall:
          // skip since it's the same color as the background
          continue;
        case LevelDataType.End:
          context.fillStyle = 'rgb(255, 255, 255)';
          break;
        case LevelDataType.Start:
          context.fillStyle = 'rgb(244, 114, 182)';
          break;
        case LevelDataType.Hole:
          context.fillStyle = 'rgb(65, 65, 65)';
          break;
        default:
          context.fillStyle = 'rgb(0, 0, 0)';
        }

        context.fillRect(
          xOffset + x * cellSize + cellMargin,
          yOffset + y * cellSize + cellMargin,
          cellSize - 2 * cellMargin,
          cellSize - 2 * cellMargin,
        );

        context.fillStyle = levelDataType === LevelDataType.Hole ? 'rgb(106, 106, 106)' : 'rgb(183, 119, 57)';

        if (LevelDataType.canMoveLeft(levelDataType) || levelDataType === LevelDataType.Hole) {
          context.fillRect(
            xOffset + (x + 1) * cellSize - cellMargin - borderWidth,
            yOffset + y * cellSize + cellMargin,
            borderWidth,
            cellSize - 2 * cellMargin,
          );
        }

        if (LevelDataType.canMoveUp(levelDataType) || levelDataType === LevelDataType.Hole) {
          context.fillRect(
            xOffset + x * cellSize + cellMargin,
            yOffset + (y + 1) * cellSize - cellMargin - borderWidth,
            cellSize - 2 * cellMargin,
            borderWidth
          );
        }

        if (LevelDataType.canMoveRight(levelDataType) || levelDataType === LevelDataType.Hole) {
          context.fillRect(
            xOffset + x * cellSize + cellMargin,
            yOffset + y * cellSize + cellMargin,
            borderWidth,
            cellSize - 2 * cellMargin,
          );
        }

        if (LevelDataType.canMoveDown(levelDataType) || levelDataType === LevelDataType.Hole) {
          context.fillRect(
            xOffset + x * cellSize + cellMargin,
            yOffset + y * cellSize + cellMargin,
            cellSize - 2 * cellMargin,
            borderWidth,
          );
        }
      }
    }

    const stream = new PassThrough();

    await PImage.encodePNGToStream(canvas, stream);
    const pngData = await stream.read();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', pngData.length);

    // save buffer to database to cache
    await LevelImageModel.create({
      _id: new ObjectId(),
      image: pngData,
      levelId: level._id,
      ts: getTs(),
    });

    return res.status(200).send(pngData);
  }
}
