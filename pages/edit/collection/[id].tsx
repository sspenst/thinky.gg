/* istanbul ignore file */

import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import formattedAuthorNote from '../../../components/formattedAuthorNote';
import LinkInfo from '../../../components/linkInfo';
import Page from '../../../components/page';
import Select from '../../../components/select';
import Dimensions from '../../../constants/dimensions';
import { AppContext } from '../../../contexts/appContext';
import useUser from '../../../hooks/useUser';
import Collection from '../../../models/db/collection';
import { EnrichedLevel } from '../../../models/db/level';
import SelectOption from '../../../models/selectOption';
import SelectOptionStats from '../../../models/selectOptionStats';

export default function CollectionEditPage() {
  const router = useRouter();
  const { isLoading, user } = useUser();
  const { id } = router.query;
  const { setIsLoading } = useContext(AppContext);
  const [collection, setCollection] = useState<Collection>();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, router, user]);

  const getCollection = useCallback(() => {
    if (!id) {
      return;
    }

    fetch(`/api/collection/${id}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setCollection(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.trace(err);
      toast.dismiss();
      toast.error('Error fetching collection');
    });
  }, [id]);

  useEffect(() => {
    getCollection();
  }, [getCollection]);

  useEffect(() => {
    setIsLoading(!collection);
  }, [collection, setIsLoading]);

  const getOptions = useCallback(() => {
    if (!collection || !collection.levels) {
      return [];
    }

    const levels = collection.levels as EnrichedLevel[];

    return levels.map(level => {
      return {
        height: Dimensions.OptionHeightMedium,
        href: level.isDraft ? `/edit/${level._id.toString()}` : `/level/${level._id.toString()}`,
        id: level._id.toString(),
        level: level,
        stats: new SelectOptionStats(level.leastMoves, level.userMoves),
        text: level.name,
      } as SelectOption;
    });
  }, [collection]);

  const onChange = function(updatedItems: SelectOption[]) {
    if (!collection) {
      return;
    }

    fetch(`/api/collection/${collection._id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        levels: updatedItems.map(option => option.id),
      }),
    }).then(async res => {
      if (res.status === 200) {
        setCollection(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.trace(err);
      toast.dismiss();
      toast.error('Error updating collection');
    });
  };

  return (
    <Page
      folders={[
        new LinkInfo('Create', '/create'),
      ]}
      title={collection?.name ?? 'Loading...'}
    >
      <>
        <div className="flex items-center justify-center pt-3">
          <h1>Drag to reorder <span className='font-bold'>{collection?.name}</span></h1>
        </div>
        {!collection || !collection.authorNote ? null :
          <div
            style={{
              margin: Dimensions.TableMargin,
              textAlign: 'center',
            }}
          >
            {formattedAuthorNote(collection.authorNote)}
          </div>
        }
        <Select onChange={onChange} options={getOptions()} prefetch={false} />
      </>
    </Page>
  );
}
