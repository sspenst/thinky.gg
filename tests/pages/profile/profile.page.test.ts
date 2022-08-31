import { ObjectId } from 'bson';
import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import { createNewReviewOnYourLevelNotification } from '../../../helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getServerSideProps } from '../../../pages/profile/[name]/[[...tab]]/index';

beforeAll(async () => {
  await dbConnect();

  for (let i = 0; i < 30; i++) {
    await createNewReviewOnYourLevelNotification(TestId.USER, TestId.USER_B, new ObjectId(), 'id ' + i);
  }
});
afterAll(async () => {
  await dbDisconnect();
});

describe('pages/profile page', () => {
  test('getServerSideProps with no parameters', async () => {
    const context = {
    };

    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret.notFound).toBe(true);
  });
  test('getServerSideProps with params parameters but no values', async () => {
    const context = {
      params: {

      }
    };

    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret.notFound).toBe(true);
  });
  test('getServerSideProps with params parameters multiple folder structure should 404', async () => {
    const context = {
      params: {
        name: 'test',
        tab: ['reviews-written', 'reviews', 'reviews']
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.notFound).toBe(true);
  });
  test('getServerSideProps with name params parameters', async () => {
    const context = {
      params: {
        name: 'test',
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.page).toBe(1);
    // These should both be zero since we arent on this tab
    expect(ret.props?.reviewsReceived).toHaveLength(0);
    expect(ret.props?.reviewsWritten).toHaveLength(0);
    expect(ret.props?.tabSelect).toBe('');
    expect(ret.props?.reviewsReceivedCount).toBe(1);
    expect(ret.props?.reviewsWrittenCount).toBe(1);
    expect(ret.props?.user._id).toBe(TestId.USER);
  });
  test('getServerSideProps with name params parameters', async () => {
    const context = {
      params: {
        name: 'test',
        tab: ['reviews-received'],
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.page).toBe(1);

    expect(ret.props?.reviewsReceived).toHaveLength(1);
    expect(ret.props?.reviewsWritten).toHaveLength(0);// This should be zero since we arent on this tab
    expect(ret.props?.tabSelect).toBe('reviews-received');
    expect(ret.props?.reviewsReceivedCount).toBe(1);
    expect(ret.props?.reviewsWrittenCount).toBe(1);
    expect(ret.props?.user._id).toBe(TestId.USER);
  });
  test('getServerSideProps with name params parameters', async () => {
    const context = {
      params: {
        name: 'test',
        tab: ['reviews-written'],
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.page).toBe(1);

    expect(ret.props?.reviewsReceived).toHaveLength(0);// This should be zero since we arent on this tab
    expect(ret.props?.reviewsWritten).toHaveLength(1);
    expect(ret.props?.tabSelect).toBe('reviews-written');
    expect(ret.props?.reviewsReceivedCount).toBe(1);
    expect(ret.props?.reviewsWrittenCount).toBe(1);
    expect(ret.props?.user._id).toBe(TestId.USER);
  });
});
