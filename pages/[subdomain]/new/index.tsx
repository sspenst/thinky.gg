/* istanbul ignore file */

import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useState } from 'react';
import Editor from '../../../components/editor/editor';
import LinkInfo from '../../../components/formatted/linkInfo';
import Page from '../../../components/page/page';
import useNavigatePrompt from '../../../hooks/useNavigatePrompt';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  if (!reqUser) {
    return {
      redirect: {
        destination: '/login' + (context.resolvedUrl ? '?redirect=' + encodeURIComponent(context.resolvedUrl) : ''),
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

export default function New() {
  const [isDirty, setIsDirty] = useState(false);
  const [level, setLevel] = useState({
    data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000000\n0000000003',
    height: 10,
    leastMoves: 0,
    width: 10,
  } as Level);

  useNavigatePrompt(isDirty);

  return (
    <Page
      folders={[
        new LinkInfo('Create', '/create'),
      ]}
      isFullScreen={true}
      title={`New level${isDirty ? '*' : ''}`}
    >
      <Editor
        isDirty={isDirty}
        level={level}
        setIsDirty={setIsDirty}
        setLevel={setLevel}
      />
    </Page>
  );
}
