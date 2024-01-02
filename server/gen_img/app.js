// launch with:
//       node app.js
const { chromium } = require('playwright');
const express = require('express');
const app = express();
const port = 3000;
const expectedSecret = process.env.GEN_IMG_SECRET; // The expected secret value

app.get('/screenshot', async (req, res) => {
  const { url, secret } = req.query;

  // Check if both url and secret are provided and secret is correct
  if (!url || !secret || secret !== expectedSecret) {
    return res.status(400).send('Missing or incorrect parameters');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(req.query.url);
    const firstDiv = await page.$('div'); // Selects the first div on the page
    if (firstDiv) {
      const screenshot = await firstDiv.screenshot();
      res.contentType('image/png');
      res.send(screenshot);
    } else {
      res.status(404).send('No div found on the page');
    }
  } catch (error) {
    res.status(500).send('Error taking screenshot: ' + error.message);
  } finally {
    await browser.close();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
