import React, { useCallback, useContext, useEffect, useState } from 'react';
import AddLevelModal from './modal/addLevelModal';
import { AppContext } from '../contexts/appContext';
import DeleteLevelModal from './modal/deleteLevelModal';
import Dimensions from '../constants/dimensions';
import Level from '../models/db/level';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import PublishLevelModal from './modal/publishLevelModal';
import UnpublishLevelModal from './modal/unpublishLevelModal';
import World from '../models/db/world';

interface LevelTableProps {
  worlds: World[];
}

export default function LevelTable({ worlds }: LevelTableProps) {
  const [isAddLevelOpen, setIsAddLevelOpen] = useState(false);
  const [isDeleteLevelOpen, setIsDeleteLevelOpen] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [isUnpublishLevelOpen, setIsUnpublishLevelOpen] = useState(false);
  const [levels, setLevels] = useState<Level[]>();
  const [levelToModify, setLevelToModify] = useState<Level>();
  const { setIsLoading } = useContext(AppContext);
  const { windowSize } = useContext(PageContext);
  const tableWidth = windowSize.width - 2 * Dimensions.TableMargin;

  const getLevels = useCallback(() => {
    fetch('/api/levels', {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setLevels(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching levels');
    });
  }, []);

  useEffect(() => {
    getLevels();
  }, [getLevels]);

  useEffect(() => {
    setIsLoading(!levels);
  }, [levels, setIsLoading]);

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
        <td style={{ width: Dimensions.ControlWidth }}>
          {levels[i].isDraft ?
            <button
              className='italic underline'
              onClick={() => {
                setLevelToModify(levels[i]);
                setIsPublishLevelOpen(true);
              }}
            >
              Publish
            </button>
            :
            <button
              className='italic underline'
              onClick={() => {
                setLevelToModify(levels[i]);
                setIsUnpublishLevelOpen(true);
              }}
            >
              Unpublish
            </button>
          }
        </td>
        <td style={{ width: Dimensions.ControlWidth }}>
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
        <td style={{ width: Dimensions.ControlWidth }}>
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
    <div>
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
      />
      {!levelToModify ? null : <>
        <PublishLevelModal
          closeModal={() => setIsPublishLevelOpen(false)}
          isOpen={isPublishLevelOpen}
          level={levelToModify}
          onPublish={() => getLevels()}
          worlds={worlds}
        />
        <UnpublishLevelModal
          closeModal={() => {
            setIsUnpublishLevelOpen(false);
            getLevels();
          }}
          isOpen={isUnpublishLevelOpen}
          level={levelToModify}
        />
        <DeleteLevelModal
          closeModal={() => {
            setIsDeleteLevelOpen(false);
            getLevels();
          }}
          isOpen={isDeleteLevelOpen}
          level={levelToModify}
        />
      </>}
    </div>
  );
}
