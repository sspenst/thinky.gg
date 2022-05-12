import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/appContext';
import Dimensions from '../constants/dimensions';
import Level from '../models/db/level';
import Link from 'next/link';
import getFormattedDate from '../helpers/getFormattedDate';

export default function LatestLevelsTable() {
  const [levels, setLevels] = useState<Level[]>();
  const { setIsLoading } = useContext(AppContext);

  const getLevels = useCallback(() => {
    fetch(`/api/latest-levels`, {
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
      <th style={{ height: Dimensions.TableRowHeight }}>
        Name
      </th>
      <th>
        Author
      </th>
      <th>
        Difficulty
      </th>
      <th>
        Date
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
          <Link href={`/level/${levels[i]._id}`} passHref>
            <a className='font-bold underline'>
              {levels[i].name}
            </a>
          </Link>
        </td>
        <td>
          <Link href={`/profile/${levels[i].userId._id}`} passHref>
            <a className='font-bold underline'>
              {levels[i].userId.name}
            </a>
          </Link>
        </td>
        <td>
          {levels[i].points}
        </td>
        <td>
          {getFormattedDate(levels[i].ts)}
        </td>
      </tr>
    );
  }

  return (
    <div className='table-padding'>
      <table
        style={{
          margin: `${Dimensions.TableMargin}px auto`,
        }}
      >
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
  );
}
