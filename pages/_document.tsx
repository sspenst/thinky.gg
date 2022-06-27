import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';
import React from 'react';

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
          <meta name='description' content='Pathology' />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"></meta>
        </Head>
        <body className='theme-modern'>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
