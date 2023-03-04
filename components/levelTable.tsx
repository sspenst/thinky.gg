import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import Level from '../models/db/level';
import AddLevelModal from './modal/addLevelModal';
import DeleteLevelModal from './modal/deleteLevelModal';
import PublishLevelModal from './modal/publishLevelModal';

interface LevelTableProps {
  levels: Level[];
}

export default function LevelTable({ levels }: LevelTableProps) {
  const [isAddLevelOpen, setIsAddLevelOpen] = useState(false);
  const [isDeleteLevelOpen, setIsDeleteLevelOpen] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [levelToModify, setLevelToModify] = useState<Level>();
  const router = useRouter();

  const rows = [
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

  for (let i = 0; i < levels.length; i++) {
    const row = (
      <tr key={`level-${levels[i]._id}`}>
        <td className='break-all h-11'>
          <Link href={`/edit/${levels[i]._id}`} passHref className='font-bold underline'>
            {levels[i].name}
          </Link>
        </td>
        <td className='w-22'>
          <button
            className='italic underline'
            onClick={() => {
              setLevelToModify(levels[i]);
              setIsPublishLevelOpen(true);
            }}
          >
            Publish
          </button>
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
      </tr>
    );

    rows.push(row);
  }

  if (rows.length === 1) {
    rows.push(
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
          {rows}
        </tbody>
      </table>
      <AddLevelModal
        closeModal={() => {
          setIsAddLevelOpen(false);
          router.reload();
        }}
        isOpen={isAddLevelOpen}
        level={levelToModify}
      />
      {!levelToModify ? null : <>
        <PublishLevelModal
          closeModal={() => setIsPublishLevelOpen(false)}
          isOpen={isPublishLevelOpen}
          level={levelToModify}
        />
        <DeleteLevelModal
          closeModal={() => setIsDeleteLevelOpen(false)}
          isOpen={isDeleteLevelOpen}
          level={levelToModify}
        />
      </>}
    </div>
  );
}
