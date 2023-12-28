/* istanbul ignore file */

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

  if (!global.puppetBrowser?.connected) {
    global.puppetBrowser = undefined;
  }

  const browser = global.puppetBrowser ?? (await puppeteer.launch({
    /// headless true
    headless: 'new',
    // using chromium

    args: [
      // https://stackoverflow.com/questions/58488138/how-to-improve-puppeteer-startup-performance-during-tests
      '--no-sandbox',
      '--disable-setuid-sandbox',

    ],
  }));

  global.puppetBrowser = browser;
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on('request', (req) => {
    if (req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image' || req.resourceType() == 'media' || req.resourceType() == 'fetch' || req.resourceType() === 'other' || req.resourceType() === 'manifest') {
      req.abort();
    } else {
      req.continue();
    }
  });

  const game = getGameFromId(lvl.gameId);

  try {
    let start = Date.now();
    const url = game.baseUrl + '/level-shim/' + lvl?._id;

    console.log((Date.now() - start) + 'ms to get url: ' + url);
    start = Date.now();
    await page.goto(url);
    console.log((Date.now() - start) + 'ms to goto url: ' + url);
    start = Date.now();
    await page.setViewport({ width: 800, height: 600 });
    console.log((Date.now() - start) + 'ms to set viewport: ' + url);
    start = Date.now();
    await page.waitForSelector('#grid-' + lvl?._id.toString());
    console.log((Date.now() - start) + 'ms to wait for selector: ' + url);
    start = Date.now();
    // Select the div element using its CSS selector
    const divElement = await page.$('#grid-' + lvl?._id.toString()); // Replace '#myDiv' with your actual selector

    console.log((Date.now() - start) + 'ms to get div element: ' + url);

    if (!divElement) {
      throw new Error('divElement not found');
    }

    // execute document.documentElement.style.setProperty('--level-grid-text', 'rgba(0, 0, 0, 0)');
    // and document.documentElement.style.setProperty('--player-grid-text', 'rgba(0, 0, 0, 0)');
    start = Date.now();
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
    console.log((Date.now() - start) + 'ms to remove text nodes: ' + url);
    start = Date.now();
    const screenshotBuffer = await divElement.screenshot({ encoding: 'binary' });

    console.log((Date.now() - start) + 'ms to take screenshot: ' + url);
    start = Date.now();
    const bitmapBuffer = await sharp(screenshotBuffer)
      .toFormat('png')
      .toBuffer();

    console.log((Date.now() - start) + 'ms to convert to png: ' + url);
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

    await page.close();

    return bitmapBuffer;
  } catch (e) {
    logger.error(e);
    await page?.close();
  }
}
