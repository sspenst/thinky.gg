/* istanbul ignore file */
import Analytics from '@root/components/Analytics';
import Theme from '@root/constants/theme';
import User from '@root/models/db/user';
import { Types } from 'mongoose';
import Document, { DocumentContext, DocumentInitialProps, Head, Html, Main, NextScript } from 'next/document';
import Script from 'next/script';
import React from 'react';
import { logger } from '../helpers/logger';
import dbConnect from '../lib/dbConnect';
import isLocal from '../lib/isLocal';
import { UserModel } from '../models/mongoose';

// TODO: maybe someday try this again https://newrelic.com/blog/how-to-relic/nextjs-monitor-application-data
// eslint-disable-next-line @typescript-eslint/no-explicit-any

if (process.env.NO_LOGS !== 'true') {
  if (!isLocal()) {
    logger.warn('RUNNING IN NON LOCAL MODE.');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } else {
    logger.warn('RUNNING IN LOCAL MODE');
  }

  const outputs = [
    [ true, 'NODE_ENV', (v: string) => (v) ],
    [ false, 'DISCORD_WEBHOOK_TOKEN_PATHOLOGY_LEVELS', (v: string) => (v.length > 0) ],
    [ false, 'DISCORD_WEBHOOK_TOKEN_PATHOLOGY_NOTIFS', (v: string) => (v.length > 0) ],
    [ true, 'JWT_SECRET', (v: string) => (v.length > 0) ],
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

if (process.env.OFFLINE_BUILD !== 'true') {
  const benchmark_start = Date.now();
  const containerRunInstanceId = new Types.ObjectId();

  logger.warn('[Run ID ' + containerRunInstanceId + '] Starting... Trying to connect to DB');
  dbConnect().then(async () => { // Hopefully this works... and prevents the big spike in performance on every deploy...
    await UserModel.findOne({}, { _id: 1 }).lean<User>();

    logger.warn('[Run ID ' + containerRunInstanceId + '] Connected to database and ran a sample query in ' + (Date.now() - benchmark_start) + 'ms');
  });
}

interface DocumentProps extends DocumentInitialProps {
  browserTimingHeader: string;
}

class MyDocument extends Document<DocumentProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);

    return initialProps;
  }
  render() {
    return (
      <Html lang='en'>
        <Head>
          <link href='/manifest.json' rel='manifest' />
          <script
            dangerouslySetInnerHTML={{ __html: this.props.browserTimingHeader }}
            type='text/javascript'
          />
          <Script
            id='load-theme'
            strategy='beforeInteractive'
            dangerouslySetInnerHTML={{
              __html: `
!function() {
  const theme = localStorage.getItem('theme');

  // set data-theme-dark for Tailwind dark classes
  document.documentElement.setAttribute('data-theme-dark', theme === 'theme-light' ? 'false' : 'true');

  // check for an invalid theme and default to theme-modern
  // ThemeProvider doesn't handle this case with defaultTheme so we have to do it manually here
  if (!${JSON.stringify(Object.values(Theme))}.includes(theme)) {
    localStorage.setItem('theme', 'theme-modern');
  }
}();
              `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
          <noscript>
            <iframe
              src={'https://www.googletagmanager.com/ns.html?id=GTM-WBDLFZ5T'}
              height='0'
              width='0'
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
          <Script
            id='gtm-script'
            strategy='afterInteractive'
            dangerouslySetInnerHTML={{
              __html: `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer', "GTM-WBDLFZ5T");
  `,
            }}
          />

        </body>
      </Html>
    );
  }
}
export default MyDocument;
