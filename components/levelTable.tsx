import React, { useCallback, useContext, useEffect, useState } from 'react';
import AddLevelModal from './modal/addLevelModal';
import { AppContext } from '../contexts/appContext';
import DeleteLevelModal from './modal/deleteLevelModal';
import Dimensions from '../constants/dimensions';
import Level from '../models/db/level';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import useStats from '../hooks/useStats';
import useUser from '../hooks/useUser';

interface LevelTableProps {
  worldId: string;
}

export default function LevelTable({ worldId }: LevelTableProps) {
  const [isAddLevelOpen, setIsAddLevelOpen] = useState(false);
  const [isDeleteLevelOpen, setIsDeleteLevelOpen] = useState(false);
  const [levels, setLevels] = useState<Level[]>();
  const [levelToModify, setLevelToModify] = useState<Level>();
  const { mutateStats } = useStats();
  const { mutateUser } = useUser();
  const { setIsLoading } = useContext(AppContext);
  const { windowSize } = useContext(PageContext);
  const tableWidth = windowSize.width - 2 * Dimensions.TableMargin;

  const getLevels = useCallback(() => {
    fetch(`/api/levels/${worldId}`, {
      method: 'GET',
    })
    .then(async res => {
      if (res.status === 200) {
        setLevels(await res.json());
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error fetching levels');
    });
  }, [worldId]);

  useEffect(() => {
    getLevels();
  }, [getLevels]);

  useEffect(() => {
    setIsLoading(!levels);
  }, [levels, setIsLoading]);

  function publish(level: Level) {
    setIsLoading(true);

    fetch(`/api/publish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    })
    .then(async res => {
      if (res.status === 200) {
        getLevels();
        mutateStats();
        mutateUser();
      } else {
        alert(await res.text());
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error publishing level');
    })
    .finally(() => {
      setIsLoading(false);
    });
  }

  function unpublish(level: Level) {
    setIsLoading(true);

    fetch(`/api/unpublish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    })
    .then(async res => {
      if (res.status === 200) {
        getLevels();
        mutateStats();
        mutateUser();
      } else {
        alert(await res.text());
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error unpublishing level');
    })
    .finally(() => {
      setIsLoading(false);
    });
  }

  const rows = [
    <tr key={-1} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th colSpan={4} style={{ height: Dimensions.TableRowHeight }}>
        <button
          className='font-bold underline'
          onClick={() => {
            setLevelToModify(undefined);
            setIsAddLevelOpen(true);
          }}
        >
          + New Level...
        </button>
      </th>
    </tr>
  ];

  if (!levels) {
    return null;
  }

  for (let i = 0; i < levels.length; i++) {
    rows.push(
      <tr key={i}>
        <td style={{ height: Dimensions.TableRowHeight }}>
          {levels[i].isDraft ?
            <Link href={`/edit/${levels[i]._id}`} passHref>
              <a className='font-bold underline'>
                {levels[i].name}
              </a>
            </Link>
            :
            levels[i].name
          }
        </td>
        <td style={{ width: Dimensions.ControlSize }}>
          {levels[i].isDraft ?
            <button
              className='italic underline'
              onClick={() => publish(levels[i])}
            >
              Publish
            </button>
            :
            <button
              className='italic underline'
              onClick={() => unpublish(levels[i])}
            >
              Unpublish
            </button>
          }
        </td>
        <td style={{ width: Dimensions.ControlSize }}>
          <button
            className='italic underline'
            onClick={() => {
              setLevelToModify(levels[i]);
              setIsAddLevelOpen(true);
            }}
          >
            Edit
          </button>
        </td>
        <td style={{ width: Dimensions.ControlSize }}>
          <button
            className='italic underline'
            onClick={() => {
              setLevelToModify(levels[i]);
              setIsDeleteLevelOpen(true);
            }}
          >
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className='hide-scroll'>
      <table style={{
        margin: `${Dimensions.TableMargin}px auto`,
        width: tableWidth,
      }}>
        <tbody>
          {rows}
        </tbody>
      </table>
      <AddLevelModal
        closeModal={() => {
          setIsAddLevelOpen(false);
          getLevels();
        }}
        isOpen={isAddLevelOpen}
        level={levelToModify}
        worldId={worldId}
      />
      {levelToModify ? <DeleteLevelModal
        closeModal={() => {
          setIsDeleteLevelOpen(false);
          getLevels();
        }}
        isOpen={isDeleteLevelOpen}
        level={levelToModify}
      /> : null}
    </div>
  );
}
