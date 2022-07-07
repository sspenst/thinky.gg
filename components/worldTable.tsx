import React, { useContext, useState } from 'react';
import AddWorldModal from './modal/addWorldModal';
import DeleteWorldModal from './modal/deleteWorldModal';
import Dimensions from '../constants/dimensions';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import World from '../models/db/world';

interface WorldTableProps {
  getWorlds: () => void;
  worlds: World[] | undefined;
}

export default function WorldTable({ getWorlds, worlds }: WorldTableProps) {
  const [isAddWorldOpen, setIsAddWorldOpen] = useState(false);
  const [isDeleteWorldOpen, setIsDeleteWorldOpen] = useState(false);
  const { windowSize } = useContext(PageContext);
  const [worldToModify, setWorldToModify] = useState<World>();
  const tableWidth = windowSize.width - 2 * Dimensions.TableMargin;

  if (!worlds) {
    return (
      <div
        style={{
          margin: Dimensions.TableMargin,
          textAlign: 'center',
        }}
      >
        Loading worlds...
      </div>
    );
  }

  const rows = [
    <tr key={-1} style={{ backgroundColor: 'var(--bg-color-2)' }}>
      <th colSpan={3} style={{ height: Dimensions.TableRowHeight }}>
        <button
          className='font-bold underline'
          onClick={() => {
            setWorldToModify(undefined);
            setIsAddWorldOpen(true);
          }}
        >
          + New World...
        </button>
      </th>
    </tr>
  ];

  for (let i = 0; i < worlds.length; i++) {
    rows.push(
      <tr key={i}>
        <td style={{ height: Dimensions.TableRowHeight }}>
          <Link href={`/edit/world/${worlds[i]._id}`} passHref>
            <a className='font-bold underline'>{worlds[i].name}</a>
          </Link>
        </td>
        <td className='pr-4' style={{ width: 0 }}>
          <button
            className='italic underline'
            onClick={() => {
              setWorldToModify(worlds[i]);
              setIsAddWorldOpen(true);
            }}
          >
            Edit
          </button>
        </td>
        <td className='pr-4' style={{ width: 0 }}>
          <button
            className='italic underline'
            onClick={() => {
              setWorldToModify(worlds[i]);
              setIsDeleteWorldOpen(true);
            }}
          >
            Delete
          </button>
        </td>
      </tr>
    );
  }

  if (rows.length === 1) {
    rows.push(
      <tr key={-1}>
        <td className='italic' colSpan={4} style={{ height: Dimensions.TableRowHeight }}>
          No worlds
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
      <AddWorldModal
        closeModal={() => {
          setIsAddWorldOpen(false);
          getWorlds();
        }}
        isOpen={isAddWorldOpen}
        world={worldToModify}
      />
      {worldToModify ? <DeleteWorldModal
        closeModal={() => {
          setIsDeleteWorldOpen(false);
          getWorlds();
        }}
        isOpen={isDeleteWorldOpen}
        world={worldToModify}
      /> : null}
    </div>
  );
}
