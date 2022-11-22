/* istanbul ignore file */

import { ObjectId } from 'bson';
import newrelic from 'newrelic';
import Document, { DocumentContext, DocumentInitialProps, Head, Html, Main, NextScript } from 'next/document';
import Script from 'next/script';
import React from 'react';
import Theme from '../constants/theme';
import { logger } from '../helpers/logger';
import dbConnect from '../lib/dbConnect';
import isLocal from '../lib/isLocal';
import { UserModel } from '../models/mongoose';
import startSocketIOServer from './socket';

if (process.env.NO_LOGS !== 'true') {
  if (!isLocal()) {
    logger.warn('RUNNING IN NON LOCAL MODE. Including newrelic');
    require('newrelic');
  } else {
    logger.warn('RUNNING IN LOCAL MODE');
  }

  const outputs = [
    [ true, 'NODE_ENV', (v: string) => (v) ],
    [ false, 'DISCORD_WEBHOOK_TOKEN_LEVELS', (v: string) => (v.length > 0) ],
    [ false, 'DISCORD_WEBHOOK_TOKEN_NOTIFS', (v: string) => (v.length > 0) ],
    [ true, 'JWT_SECRET', (v: string) => (v.length > 0) ],
    [ true, 'EMAIL_PASSWORD', (v: string) => (v.length > 0) ],
    [ true, 'REVALIDATE_SECRET', (v: string) => (v.length > 0)],
    [ false, 'PROD_MONGODB_URI', (v: string) => (v.length > 0) ],
    [ false, 'STAGE_MONGODB_URI', (v: string) => (v.length > 0) ],
    [ false, 'STAGE_JWT_SECRET', (v: string) => (v.length > 0) ],
    [ false, 'NEW_RELIC_API_KEY', (v: string) => (v.length > 0) ],
    [ false, 'NEW_RELIC_LICENSE_KEY', (v: string) => (v.length > 0) ],
    [ false, 'METABASE_POSTGRES_USER', (v: string) => (v) ],
    [ false, 'METABASE_POSTGRES_PASSWORD', (v: string) => (v.length > 0) ]
  ];

  for (const [needInDev, key, validator] of outputs) {
    try {
      const val = process.env[key as string];

      if (val === undefined || typeof validator !== 'function') {
        if (needInDev && isLocal()) {
          logger.error(`Warning: ${key} is not set`);
        }
      }
    } catch (e) {
      logger.warn(`Warning: ${key} is not set`);
    }
  }
}

const benchmark_start = Date.now();
const containerRunInstanceId = new ObjectId();

logger.warn('[Run ID ' + containerRunInstanceId + '] Starting... Trying to connect to DB');
dbConnect().then(async () => { // Hopefully this works... and prevents the big spike in performance on every deploy...
  await UserModel.findOne({}, { _id: 1 }, { lean: true });

  logger.warn('[Run ID ' + containerRunInstanceId + '] Connected to database and ran a sample query in ' + (Date.now() - benchmark_start) + 'ms');

  await startSocketIOServer();

  logger.warn('Warmed up socket server');
});
interface DocumentProps extends DocumentInitialProps {
  browserTimingHeader: string
}

class MyDocument extends Document<DocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);

    // Newrelic script
    const browserTimingHeader = await newrelic.getBrowserTimingHeader({
      hasToRemoveScriptWrapper: true,
    });

    return {
      ...initialProps,
      browserTimingHeader,
    };
  }

  render() {
    const { browserTimingHeader } = this.props;

    return (
      <Html lang='en'>
        <Head>
          <link href='https://fonts.googleapis.com/css2?family=Rubik:wght@400&display=swap' rel='stylesheet' />
          <link href='https://fonts.googleapis.com/css2?family=Teko&display=swap&text=0123456789' rel='stylesheet' />
          <link href='/manifest.json' rel='manifest' />
          <link href='/logo.svg' rel='icon' />
        </Head>
        <body className={Theme.Modern}>
          <Main />
          <NextScript />
          <Script
            id='newrelic'
            dangerouslySetInnerHTML={{ __html: browserTimingHeader }}
            strategy="beforeInteractive"
          ></Script>
        </body>
      </Html>
    );
  }
}
export default MyDocument;
