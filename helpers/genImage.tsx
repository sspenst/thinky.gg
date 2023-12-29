/* istanbul ignore file */

import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import Level from '@root/models/db/level';
import { ImageModel } from '@root/models/mongoose';
import level from '@root/pages/api/level';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { TimerUtil } from './getTs';
import { logger } from './logger';

export default async function genImage(lvl: Level) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  await ImageModel.deleteOne(
    { documentId: lvl._id },

  );
  const start = Date.now();

  console.log('start img gen');
  let tempStart;
  let browser;

  try {
    if (global.puppetBrowser?.connected === false) {
      console.log('browser disconnected');
      global.puppetBrowser = undefined;
    }

    browser = global.puppetBrowser || await puppeteer.launch({
    /// headless true
      headless: 'new',
      // using chromium

      args: [
      // https://stackoverflow.com/questions/58488138/how-to-improve-puppeteer-startup-performance-during-tests
        '--no-sandbox',
        '--disable-setuid-sandbox',

      ],
    });
    global.puppetBrowser = browser;

    console.log('done with launch puppeteer', Date.now() - start);
    tempStart = Date.now();

    const page = await browser.newPage();

    console.log('done with new page', Date.now() - tempStart, 'total', Date.now() - start);
    const game = getGameFromId(lvl.gameId);
    const url = game.baseUrl + '/level-shim/' + lvl?._id.toString();

    await page.setRequestInterception(true);

    page.on('request', (req) => {
      if ( req.resourceType() == 'font' || req.resourceType() == 'image' || req.resourceType() == 'media' || req.resourceType() == 'fetch') {
        req.abort();
      } else {
        req.continue();
      }
    });

    tempStart = Date.now();
    await page.goto(url);
    console.log('done with goto', Date.now() - tempStart, 'total', Date.now() - start);
    tempStart = Date.now();
    await page.setViewport({ width: 800, height: 600 });
    console.log('done with setViewport', Date.now() - tempStart, 'total', Date.now() - start);
    tempStart = Date.now();

    console.log('done with setRequestInterception', Date.now() - tempStart, 'total', Date.now() - start);

    await page.waitForSelector('#grid-' + lvl._id.toString());

    console.log('done with waitForSelector', Date.now() - tempStart, 'total', Date.now() - start);
    const divElement = await page.$('#grid-' + lvl._id.toString());

    if (!divElement) {
      throw new Error('divElement not found');
    }

    tempStart = Date.now();
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
    console.log('done with evaluate', Date.now() - tempStart, 'total', Date.now() - start);
    tempStart = Date.now();
    const screenshotBuffer = await divElement.screenshot({ encoding: 'binary' });

    console.log('done with screenshot', Date.now() - tempStart, 'total', Date.now() - start);
    tempStart = Date.now();
    await page.close();
    console.log('done with page.close', Date.now() - tempStart, 'total', Date.now() - start);
    tempStart = Date.now();

    const bitmapBuffer = await sharp(screenshotBuffer)
      .toFormat('png')
      .toBuffer();

    console.log('done with sharp', Date.now() - tempStart, 'total', Date.now() - start);
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
  } catch (e) {
    console.error(e);
    await browser?.close();
  }
}
