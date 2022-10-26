/* istanbul ignore file */

import { Rubik, Teko } from '@next/font/google';
import classNames from 'classnames';
import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';
import React from 'react';
import Theme from '../constants/theme';
import { logger } from '../helpers/logger';
import isLocal from '../lib/isLocal';

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
        if (needInDev || !isLocal()) {
          logger.error(`Warning: ${key} is not set`);
        }
      }
    } catch (e) {
      logger.warn(`Warning: ${key} is not set`);
    }
  }
}

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);

    return initialProps;
  }

  render() {
    const rubik = Rubik();
    const teko = Teko({ weight: '700' });

    return (
      <Html lang='en' className={classNames(rubik.className, teko.className)}>
        <Head>
          <link href='/manifest.json' rel='manifest' />
          <link href='/logo.svg' rel='icon' />
        </Head>
        <body className={Theme.Modern}>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
export default MyDocument;
