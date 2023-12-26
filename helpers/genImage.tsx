// pages/api/render-grid.js

import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import Level from '@root/models/db/level';
import { ImageModel } from '@root/models/mongoose';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { TimerUtil } from './getTs';
import { logger } from './logger';

export default async function genImage(lvl: Level) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const browser = await puppeteer.launch({
    /// headless true
    headless: 'new',
    // using chromium
    args: ['--no-sandbox', '--disable-setuid-sandbox'],

  });
  const page = await browser.newPage();

  const game = getGameFromId(lvl.gameId);

  try {
    const url = game.baseUrl + '/level/' + lvl?.slug;

    await page.goto(url, { waitUntil: 'networkidle2' });

    // Select the div element using its CSS selector
    const divElement = await page.$('#grid-' + lvl?._id.toString()); // Replace '#myDiv' with your actual selector

    if (!divElement) {
      throw new Error('divElement not found');
    }

    // execute document.documentElement.style.setProperty('--level-grid-text', 'rgba(0, 0, 0, 0)');
    // and document.documentElement.style.setProperty('--player-grid-text', 'rgba(0, 0, 0, 0)');

    await page.evaluate(() => {
      document.querySelectorAll('.tile-type-4').forEach(element => {
        element.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            element.removeChild(child);
          }
        });
      });
      document.querySelectorAll('.tile-type-3').forEach(element => {
        element.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            element.removeChild(child);
          }
        });
      });
    } );

    const screenshotBuffer = await divElement.screenshot({ encoding: 'binary' });

    const bitmapBuffer = await sharp(screenshotBuffer)
      .toFormat('png')
      .toBuffer();

    await ImageModel.findOneAndUpdate(
      { documentId: lvl._id },
      {
        documentId: lvl._id,
        image: bitmapBuffer,
        ts: TimerUtil.getTs(),
      },
      {
        upsert: true,
      },
    );
    await browser.close();

    return bitmapBuffer;
  } catch (e) {
    logger.error(e);
    await browser.close();
  }
}
