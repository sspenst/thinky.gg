import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';
import React from 'react';
import Theme from '../constants/theme';
import isLocal from '../lib/isLocal';

if (!isLocal()) {
  console.log('RUNNING IN NON LOCAL MODE. Including newrelic');
  require('newrelic');
} else {
  console.warn('RUNNING IN LOCAL MODE');
}

const outputs = [
  [ 'NODE_ENV', (v:string) => (v) ],
  [ 'DISCORD_WEBHOOK_TOKEN_LEVELS', (v:string)=>(v.length > 0) ],
  [ 'DISCORD_WEBHOOK_TOKEN_NOTIFS', (v:string)=>(v.length > 0) ],
  [ 'JWT_SECRET', (v:string)=>(v.length > 0) ],
  [ 'EMAIL_PASSWORD', (v:string)=>(v.length > 0) ],
  [ 'REVALIDATE_SECRET', (v:string)=>(v.length > 0)],
  [ 'PROD_MONGODB_URI', (v:string)=>(v.length > 0) ],
  [ 'STAGE_MONGODB_URI', (v:string)=>(v.length > 0) ],
  [ 'STAGE_JWT_SECRET', (v:string)=>(v.length > 0) ],
  [ 'NEW_RELIC_API_KEY', (v:string)=>(v.length > 0) ],
  [ 'NEW_RELIC_LICENSE_KEY', (v:string)=>(v.length > 0) ],
  [ 'METABASE_POSTGRES_USER', (v:string)=>(v) ],
  [ 'METABASE_POSTGRES_PASSWORD', (v:string)=>(v.length > 0) ]
];

for (const [key, validator] of outputs) {
  try {
    const val = process.env[key as string];

    if (val !== undefined && typeof validator === 'function') {
      console.log(key, validator(val));
    } else {
      console.warn(`Warning: ${key} is not set`);
    }
  } catch (e) {
    console.warn(`Warning: ${key} is not set`);
  }
}

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);

    return initialProps;
  }

  render() {
    return (
      <Html lang='en'>
        <Head>
          <link href='https://fonts.googleapis.com/css2?family=Rubik:wght@400&display=swap' rel='stylesheet' />
          <link href='/manifest.json' rel='manifest' />
          <link href='/favicon.png' rel='icon' />
          <meta name='theme-color' content='#000000' />
          <meta name='description' content='Pathology' key='description' />
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
