import { ObjectId } from 'bson';
import { GetServerSidePropsContext } from 'next';
import TestId from '../../../constants/testId';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { CollectionModel } from '../../../models/mongoose';
import { getServerSideProps, UniversePageProps } from '../../../pages/universe/[id]';

afterEach(() => {
  jest.restoreAllMocks();
});
beforeAll(async () => {
  await dbConnect();
});
afterAll(async() => {
  await dbDisconnect();
});

describe('pages/universe', () => {
  test('getServerSideProps with no query', async () => {
    const resp = await getServerSideProps({ params: { id: TestId.USER }, query: {} } as unknown as GetServerSidePropsContext);
    const props = resp.props as UniversePageProps;

    expect(props).toBeDefined();
    expect(props.enrichedCollections).toBeDefined();
    expect(props.enrichedCollections).toHaveLength(2);
    expect(props.enrichedCollections[0]._id.toString()).toBe(TestId.COLLECTION);
    expect(props.enrichedCollections[1]._id.toString()).toBe(TestId.COLLECTION_2);
    expect(props.enrichedLevels).toBeDefined();
    expect(props.enrichedLevels).toHaveLength(1);
    expect(props.enrichedLevels[0]._id.toString()).toBe(TestId.LEVEL);
  });
  test('getServerSideProps with search query', async () => {
    const resp = await getServerSideProps({ params: { id: TestId.USER }, query: { search: 'talll' } } as unknown as GetServerSidePropsContext);
    const props = resp.props as UniversePageProps;

    expect(props).toBeDefined();
    expect(props.enrichedCollections).toBeDefined();
    expect(props.enrichedCollections).toHaveLength(2);
    expect(props.enrichedCollections[0]._id.toString()).toBe(TestId.COLLECTION);
    expect(props.enrichedCollections[1]._id.toString()).toBe(TestId.COLLECTION_2);
    expect(props.enrichedLevels).toBeDefined();
    expect(props.enrichedLevels).toHaveLength(0);
  });
  test('getServerSideProps with invalid object id should fail', async () => {
    const resp = await getServerSideProps({ params: { id: new ObjectId() } } as unknown as GetServerSidePropsContext);

    expect(resp?.notFound).toBe(true);
  });
  test('getServerSideProps with wrong id should fail', async () => {
    const resp = await getServerSideProps({ params: { id: 'wrong' } } as unknown as GetServerSidePropsContext);

    expect(resp?.notFound).toBe(true);
  });
  test('getServerSideProps with a db error should fail', async () => {
    jest.spyOn(CollectionModel, 'find').mockReturnValueOnce({
      populate: () => {
        return {
          sort: () => {return null;}
        };
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // expect this to error
    await expect(getServerSideProps({ params: { id: TestId.USER } } as unknown as GetServerSidePropsContext)).rejects.toThrow('Error finding Levels');
  });
});
