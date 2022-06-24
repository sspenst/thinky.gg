import * as PImage from 'pureimage';

import { NextApiRequest, NextApiResponse } from 'next';

import { FontRecord } from 'pureimage/types/text';
import LevelDataType from '../../../../constants/levelDataType';
import { LevelModel } from '../../../../models/mongoose';
import { PassThrough } from 'stream';
import dbConnect from '../../../../lib/dbConnect';
import { resolve } from 'path';

let fontUrl;
let fontRecord:FontRecord;

let fontLoaded = false;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { id } = req.query;

    await dbConnect();

    const level = await LevelModel.findOne({
      _id: id,
    });

    if (!level) {
      return res.status(404).json({
        error: 'Level not found',
      });
    }

    const width = 1200;
    const height = 630;
    const canvas = PImage.make(width, height, {});
    const context = canvas.getContext('2d');

    context.fillStyle = '#aaa';
    context.fillRect(0, 0, width, height);

    context.textAlign = 'center';
    // set stroke style to black
    context.strokeStyle = '#000';
    // loops through level width and height and draw a grid
    const cellSize = height / level.height;
    const centerXOffset = (width - level.width * cellSize) / 2;
    const centerYOffset = (height - level.height * cellSize) / 2;
    const level_data = level.data.split('\n');

    for (let i = 0; i < level.height; i++) {
      const row_data = level_data[i];

      for (let j = 0; j < level.width; j++) {
        let border_strokes = [1, 1, 1, 1];
        let txt = '';

        switch (row_data[j]) {
        case LevelDataType.Start:
          // pink
          context.fillStyle = 'rgb(244, 114, 182)';
          context.strokeStyle = context.fillStyle;
          txt = '0';
          break;
        case LevelDataType.End:
          // green
          context.fillStyle = 'rgb(255, 255, 255)';
          context.strokeStyle = context.fillStyle;
          txt = level.leastMoves.toString();
          break;
        case LevelDataType.Wall:
          context.fillStyle = '#000';
          context.strokeStyle = context.fillStyle;
          break;
        case LevelDataType.Block:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          break;
        case LevelDataType.Hole:
          context.strokeStyle = 'rgb(106, 106, 106)';
          context.fillStyle = 'rgb(65, 65, 65)';
          break;
        case LevelDataType.Right:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [1, 0, 0, 0];
          break;
        case LevelDataType.Left:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [0, 1, 0, 0];
          break;
        case LevelDataType.Up:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [0, 0, 1, 0];
          break;
        case LevelDataType.Down:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [0, 0, 0, 1];
          break;
        case LevelDataType.DownLeft:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [0, 1, 0, 1];
          break;
        case LevelDataType.DownRight:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [1, 0, 0, 1];
          break;
        case LevelDataType.UpLeft:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [0, 1, 1, 0];
          break;
        case LevelDataType.UpRight:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [1, 0, 1, 0];
          break;
        case LevelDataType.LeftRight:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [0, 1, 0, 1];
          break;
        case LevelDataType.UpDown:
          context.strokeStyle = 'rgb(183, 119, 57)';
          context.fillStyle = '#000';
          border_strokes = [0, 0, 1, 1];
          break;
        default:
          context.fillStyle = 'rgb(14, 168, 117)';
          context.strokeStyle = context.fillStyle;
        }
        const strokeWidth = cellSize / 5;

        context.lineWidth = strokeWidth;
        context.fillRect(centerXOffset + j * cellSize, centerYOffset + i * cellSize, cellSize, cellSize);
        context.fillStyle = context.strokeStyle;
        // fill another rectangle within the cell

        context.beginPath();

        if (border_strokes[0] === 1) {
          context.fillRect(centerXOffset + j * cellSize, centerYOffset + i * cellSize, strokeWidth, cellSize);
        }

        if (border_strokes[1] === 1) {
          context.fillRect(centerXOffset + j * cellSize + cellSize - strokeWidth, centerYOffset + i * cellSize, strokeWidth, cellSize);
        }

        if (border_strokes[2] === 1) {
          context.fillRect(centerXOffset + j * cellSize, centerYOffset + i * cellSize + cellSize - strokeWidth, cellSize, strokeWidth);
        }

        if (border_strokes[3] === 1) {
          context.fillRect(centerXOffset + j * cellSize, centerYOffset + i * cellSize, cellSize, strokeWidth);
        }

        if (txt && txt !== '') {
          if (!fontLoaded) {
            fontUrl = __dirname + '../../../../../../../lib/fonts/Source_Sans_Pro/SourceSansPro-Regular.ttf';
            fontRecord = PImage.registerFont(resolve(fontUrl), 'MyFont', 10, '', '');
            await new Promise((resolve, reject) => {fontRecord.load(() => {
              resolve('');
            });
            });
            fontLoaded = true;
          }

          context.font = cellSize / 2 + 'px MyFont'; // Ignore this error
          context.fillStyle = '#000';
          context.fillText(txt, centerXOffset + j * cellSize + cellSize / 2, centerYOffset + i * cellSize + cellSize / 1.5);
        }
      }

    }

    context.strokeStyle = '#000';
    context.lineWidth = 5;

    for (let i = 0; i < level.height; i++) {
      for (let j = 0; j < level.width; j++) {
        context.beginPath();
        context.moveTo(centerXOffset + j * cellSize, centerYOffset + i * cellSize);
        context.lineTo(centerXOffset + (j + 1) * cellSize, centerYOffset + i * cellSize);
        context.lineTo(centerXOffset + (j + 1) * cellSize, centerYOffset + (i + 1) * cellSize);
        context.lineTo(centerXOffset + j * cellSize, centerYOffset + (i + 1) * cellSize);
        context.lineTo(centerXOffset + j * cellSize, centerYOffset + i * cellSize);
        context.stroke();
      }
    }

    context.fillStyle = '#f00';

    const stream = new PassThrough();

    await PImage.encodePNGToStream(canvas, stream);
    const pngData = await stream.read();

    res.setHeader('Content-Type', 'image/png');

    return res.status(200).send(pngData);
  }
}
