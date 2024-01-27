/* istanbul ignore file */

import { redirectToLogin } from '@root/helpers/redirectToLogin';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useState } from 'react';
import Editor from '../../../components/editor';
import LinkInfo from '../../../components/formatted/linkInfo';
import Page from '../../../components/page/page';
import useNavigatePrompt from '../../../hooks/useNavigatePrompt';
import { getUserFromToken } from '../../../lib/withAuth';
import Level from '../../../models/db/level';
import { LevelModel } from '../../../models/mongoose';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;
  const { id } = context.query;

  if (!reqUser || typeof id !== 'string') {
    return redirectToLogin(context);
  }

  const level = await LevelModel.findOne({
    _id: id,
    isDraft: true,
    userId: reqUser._id,
  });

  if (!level) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: {
      level: JSON.parse(JSON.stringify(level)),
    } as EditProps,
  };
}

interface EditProps {
  level: Level;
}

export default function Edit({ level }: EditProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [_level, setLevel] = useState(level);

  useNavigatePrompt(isDirty);

  return (
    <Page
      folders={[
        new LinkInfo('Drafts', '/drafts'),
      ]}
      isFullScreen={true}
      title={`${level?.name}${isDirty ? '*' : ''}`}
    >
      <Editor
        isDirty={isDirty}
        level={_level}
        setIsDirty={setIsDirty}
        setLevel={setLevel}
      />
    </Page>
  );
}
