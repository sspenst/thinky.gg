import React from 'react';
import Dimensions from '../constants/dimensions';
import Page from './page';

interface SkeletonPageProps {
  text?: string;
}

export default function SkeletonPage({ text }: SkeletonPageProps) {
  return (
    <Page>
      <div
        style={{
          margin: Dimensions.TableMargin,
          textAlign: 'center',
        }}
      >
        {text ? text : 'Loading...'}
      </div>
    </Page>
  );
}
