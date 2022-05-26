import Dimensions from '../constants/dimensions';
import Page from './page';
import React from 'react';

export default function SkeletonPage() {
  return (
    <Page>
      <div
        style={{
          margin: Dimensions.TableMargin,
          textAlign: 'center',
        }}
      >
        Loading...
      </div>
    </Page>
  );
}
