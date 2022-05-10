import React, { useEffect } from 'react';
import Dimensions from '../../constants/dimensions';
import Page from '../../components/page';
import WorldTable from '../../components/worldTable';
import { useRouter } from 'next/router';
import useUser from '../../hooks/useUser';

export default function Create() {
  const { isLoading, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, router, user]);

  return (
    <Page title={'Create'}>
      <>
        <div
          style={{
            marginLeft: Dimensions.TableMargin,
            marginRight: Dimensions.TableMargin,
            marginTop: Dimensions.TableMargin,
            textAlign: 'center',
          }}
        >
          Welcome to the world creation page! Here you can create worlds for your levels to exist in. After creating a world, click on its name to create levels within it. Note that a world will not appear in the catalog until it has at least one published level.
        </div>
        <WorldTable/>
      </>
    </Page>
  );
}
