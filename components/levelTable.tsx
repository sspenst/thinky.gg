import Link from 'next/link';
import React, { useState } from 'react';
import { TimerUtil } from '../helpers/getTs';
import Level from '../models/db/level';
import AddLevelModal from './modal/addLevelModal';
import DeleteLevelModal from './modal/deleteLevelModal';
import PublishLevelModal from './modal/publishLevelModal';
import UnpublishLevelModal from './modal/unpublishLevelModal';

interface LevelTableProps {
  getLevels: () => void;
  levels: Level[];
}

export default function LevelTable({ getLevels, levels }: LevelTableProps) {
  const [isAddLevelOpen, setIsAddLevelOpen] = useState(false);
  const [isDeleteLevelOpen, setIsDeleteLevelOpen] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [isUnpublishLevelOpen, setIsUnpublishLevelOpen] = useState(false);
  const [levelToModify, setLevelToModify] = useState<Level>();

  const publishedRows = [
    <tr key={'published-levels'} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th className='h-11' colSpan={4}>
        Published Levels
      </th>
    </tr>
  ];

  const unpublishedRows = [
    <tr key={'unpublished-levels'} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th className='h-11' colSpan={4}>
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

  const ts = TimerUtil.getTs();

  for (let i = 0; i < levels.length; i++) {
    const row = (
      <tr key={`level-${levels[i]._id}`}>
        <td className='break-all h-11'>
          {levels[i].isDraft ?
            <Link href={`/edit/${levels[i]._id}`} passHref className='font-bold underline'>
              {levels[i].name}
            </Link>
            :
            levels[i].name
          }
        </td>
        <td className='w-22'>
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
              {levels[i].ts < ts - 24 * 60 * 60 ? 'Archive' : 'Unpublish'}
            </button>
          }
        </td>
        <td className='w-14'>
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
        {levels[i].isDraft && (
          <td className='w-20'>
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
        )}
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
        <td className='italic h-11' colSpan={4}>
          No draft levels
        </td>
      </tr>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      <table className='w-full' style={{
        minWidth: 300,
      }}>
        <tbody>
          {unpublishedRows}
        </tbody>
      </table>
      {publishedRows.length === 1 ? null :
        <table className='w-full' style={{
          minWidth: 300,
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
        />
        <UnpublishLevelModal
          closeModal={() => setIsUnpublishLevelOpen(false)}
          isOpen={isUnpublishLevelOpen}
          level={levelToModify}
          onUnpublish={() => getLevels()}
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
