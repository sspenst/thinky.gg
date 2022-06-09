import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../contexts/appContext';
import Dimensions from '../../../constants/dimensions';
import LinkInfo from '../../../models/linkInfo';
import Page from '../../../components/page';
import Select from '../../../components/select';
import SelectOption from '../../../models/selectOption';
import StatsHelper from '../../../helpers/statsHelper';
import World from '../../../models/db/world';
import cleanAuthorNote from '../../../helpers/cleanAuthorNote';
import { useRouter } from 'next/router';
import useStats from '../../../hooks/useStats';
import useUser from '../../../hooks/useUser';

export default function WorldEditPage() {
  const router = useRouter();
  const { isLoading, user } = useUser();
  const { id } = router.query;
  const { stats } = useStats();
  const { setIsLoading } = useContext(AppContext);
  const [world, setWorld] = useState<World>();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, router, user]);

  const getWorld = useCallback(() => {
    if (!id) {
      return;
    }

    fetch(`/api/world/${id}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setWorld(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching world');
    });
  }, [id]);

  useEffect(() => {
    getWorld();
  }, [getWorld]);

  useEffect(() => {
    setIsLoading(!world);
  }, [setIsLoading, world]);

  const getOptions = useCallback(() => {
    if (!world || !world.levels) {
      return [];
    }

    const levels = world.levels;
    const levelStats = StatsHelper.levelStats(levels, stats);

    return levels.map((level, index) => new SelectOption(
      level._id.toString(),
      level.name,
      level.isDraft ? `/edit/${level._id.toString()}` : `/level/${level._id.toString()}`,
      levelStats[index],
      Dimensions.OptionHeightMedium,
      undefined,
      level.points,
      false, // disabled
      true, // draggable
    ));
  }, [stats, world]);

  const onChange = function(updatedItems: SelectOption[]) {
    if (!world) {
      return;
    }

    fetch(`/api/world/${world._id}`, {
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
        setWorld(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error updating world');
    });
  };

  return (
    <Page
      folders={[
        new LinkInfo('Create', '/create'),
      ]}
      title={world?.name ?? 'Loading...'}
    >
      <>
        {!world || !world.authorNote ? null :
          <div
            style={{
              margin: Dimensions.TableMargin,
              textAlign: 'center',
            }}
          >
            <span style={{ whiteSpace: 'pre-wrap' }}>{cleanAuthorNote(world.authorNote)}</span>
          </div>
        }
        <Select onChange={onChange} options={getOptions()} prefetch={false}/>
      </>
    </Page>
  );
}
