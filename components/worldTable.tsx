import React, { useCallback, useContext, useEffect, useState } from 'react';
import AddWorldModal from './modal/addWorldModal';
import { AppContext } from '../contexts/appContext';
import DeleteWorldModal from './modal/deleteWorldModal';
import Dimensions from '../constants/dimensions';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import World from '../models/db/world';

export default function WorldTable() {
  const [isAddWorldOpen, setIsAddWorldOpen] = useState(false);
  const [isDeleteWorldOpen, setIsDeleteWorldOpen] = useState(false);
  const { setIsLoading } = useContext(AppContext);
  const { windowSize } = useContext(PageContext);
  const [worlds, setWorlds] = useState<World[]>();
  const [worldToModify, setWorldToModify] = useState<World>();
  const tableWidth = windowSize.width - 2 * Dimensions.TableMargin;

  const getWorlds = useCallback(() => {
    fetch('/api/worlds', {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setWorlds(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching worlds');
    });
  }, []);

  useEffect(() => {
    getWorlds();
  }, [getWorlds]);

  useEffect(() => {
    setIsLoading(!worlds);
  }, [setIsLoading, worlds]);

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

  if (!worlds) {
    return null;
  }

  for (let i = 0; i < worlds.length; i++) {
    rows.push(
      <tr key={i}>
        <td style={{ height: Dimensions.TableRowHeight }}>
          <Link href={`/create/${worlds[i]._id}`} passHref>
            <a className='font-bold underline'>
              {worlds[i].name}
            </a>
          </Link>
        </td>
        <td style={{ width: Dimensions.ControlWidth }}>
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
        <td style={{ width: Dimensions.ControlWidth }}>
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
