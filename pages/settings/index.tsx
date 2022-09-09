import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import FollowButton from '../../components/FollowButton';
import FormattedUser from '../../components/formattedUser';
import Page from '../../components/page';
import SettingsForm from '../../components/settingsForm';
import useUser from '../../hooks/useUser';
import dbConnect from '../../lib/dbConnect';
import { getUserFromToken } from '../../lib/withAuth';
import { GraphModel } from '../../models/mongoose';

export async function getServerSideProps(context: GetServerSidePropsContext){
  await dbConnect();

  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token) : null;

  const followedUsers = await GraphModel.find({
    source: reqUser?._id,
    type: 'follow',
  }, 'target targetModel').populate('target').exec();

  return { props: {
    followedUsers: JSON.parse(JSON.stringify(followedUsers.map((user) => user.target))),
  } };
}

/* istanbul ignore next */
export default function Settings({ followedUsers }: {followedUsers: any[]}) {
  console.log(followedUsers);
  const { error, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (error) {
      router.replace('/login');
    }
  }, [error, router]);

  return (error || isLoading ? null :
    <Page title={'Settings'}>
      <div className='flex flex-col-2'>
        <div className='mt-3 p-3'>
          <h1 className='text-2xl'>Following:</h1>

          {followedUsers.map((user) => (
            <div className='grid grid-cols-2 gap-6' key={'row-' + user._id}>
              <FormattedUser key={user._id} user={user} />
              <FollowButton user={user} reqUserFollowing={true} />
            </div>
          ))}

        </div>
        <SettingsForm />
      </div>
    </Page>
  );
}
