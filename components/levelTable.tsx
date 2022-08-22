import Link from 'next/link';
import React, { useContext, useState } from 'react';
import Dimensions from '../constants/dimensions';
import { PageContext } from '../contexts/pageContext';
import Collection from '../models/db/collection';
import Level from '../models/db/level';
import AddLevelModal from './modal/addLevelModal';
import DeleteLevelModal from './modal/deleteLevelModal';
import PublishLevelModal from './modal/publishLevelModal';
import UnpublishLevelModal from './modal/unpublishLevelModal';

interface LevelTableProps {
  collections: Collection[] | undefined;
  getCollections: () => void;
  getLevels: () => void;
  levels: Level[];
}

export default function LevelTable({ collections, getCollections, getLevels, levels }: LevelTableProps) {
  const [isAddLevelOpen, setIsAddLevelOpen] = useState(false);
  const [isDeleteLevelOpen, setIsDeleteLevelOpen] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [isUnpublishLevelOpen, setIsUnpublishLevelOpen] = useState(false);
  const [levelToModify, setLevelToModify] = useState<Level>();
  const { windowSize } = useContext(PageContext);
  const tableWidth = windowSize.width - 2 * Dimensions.TableMargin;

  if (!levels) {
    return (
      <div
        style={{
          margin: Dimensions.TableMargin,
          textAlign: 'center',
        }}
      >
        Loading levels...
      </div>
    );
  }

  const publishedRows = [
    <tr key={'published-levels'} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th colSpan={4} style={{ height: Dimensions.TableRowHeight }}>
        Published Levels
      </th>
    </tr>
  ];

  const unpublishedRows = [
    <tr key={'unpublished-levels'} style={{ backgroundColor: 'var(--bg-color-2)' }}>
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

  for (let i = 0; i < levels.length; i++) {
    const row = (
      <tr key={`level-${levels[i]._id}`}>
        <td className='break-all' style={{ height: Dimensions.TableRowHeight }}>
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
        <td style={{ width: Dimensions.ControlWidth / 2 }}>
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
        <td style={{ width: Dimensions.ControlWidth * 3 / 4 }}>
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

    if (levels[i].isDraft) {
      unpublishedRows.push(row);
    } else {
      publishedRows.push(row);
    }
  }

  if (unpublishedRows.length === 1) {
    unpublishedRows.push(
      <tr key={'no-draft-levels'}>
        <td className='italic' colSpan={4} style={{ height: Dimensions.TableRowHeight }}>
          No draft levels
        </td>
      </tr>
    );
  }

  return (
    <div>
      <table style={{
        margin: `${Dimensions.TableMargin}px auto`,
        minWidth: 300,
        width: tableWidth,
      }}>
        <tbody>
          {unpublishedRows}
        </tbody>
      </table>
      {publishedRows.length === 1 ? null :
        <table style={{
          margin: `${Dimensions.TableMargin}px auto`,
          minWidth: 300,
          width: tableWidth,
        }}>
          <tbody>
            {publishedRows}
          </tbody>
        </table>
      }
      <AddLevelModal
        closeModal={() => {
          setIsAddLevelOpen(false);
          getLevels();
          getCollections();
        }}
        collections={collections}
        isOpen={isAddLevelOpen}
        level={levelToModify}
      />
      {!levelToModify ? null : <>
        <PublishLevelModal
          closeModal={() => setIsPublishLevelOpen(false)}
          isOpen={isPublishLevelOpen}
          level={levelToModify}
          onPublish={() => getLevels()}
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
            getCollections();
          }}
          isOpen={isDeleteLevelOpen}
          level={levelToModify}
        />
      </>}
    </div>
  );
}
