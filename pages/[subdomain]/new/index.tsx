/* istanbul ignore file */

import { AppContext } from '@root/contexts/appContext';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useContext, useState } from 'react';
import Editor from '../../../components/editor';
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
  const { game } = useContext(AppContext);
  const [isDirty, setIsDirty] = useState(false);

  const data = game.newLevelData ?? '';
  const dataSplit = data.split('\n');
  const width = dataSplit[0].length;
  const height = dataSplit.length;

  const [level, setLevel] = useState({
    data: data,
    height: height,
    leastMoves: 0,
    width: width,
  } as Level);

  useNavigatePrompt(isDirty);

  return (
    <Page
      folders={[
        new LinkInfo('Drafts', '/drafts'),
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
