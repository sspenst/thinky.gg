import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import Modal from '.';
import { Types } from 'mongoose';
import World from '../../models/db/world';
import toast from 'react-hot-toast';
import useTextAreaWidth from '../../hooks/useTextAreaWidth';
import useUser from '../../hooks/useUser';
import Link from 'next/link';

interface AddLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level | undefined;
  worlds: World[] | undefined;
}

export default function AddLevelModal({ closeModal, isOpen, level, worlds }: AddLevelModalProps) {
  const [authorNote, setAuthorNote] = useState<string>();
  const [name, setName] = useState<string>();
  const [points, setPoints] = useState<number>(0);
  const { setIsLoading } = useContext(AppContext);
  const [worldIds, setWorldIds] = useState<string[]>([]);
  const user = useUser();

  useEffect(() => {
    if (!level) {
      setAuthorNote(undefined);
      setName(undefined);
      setPoints(0);

      return;
    }

    setAuthorNote(level.authorNote);
    setName(level.name);
    setPoints(level.points);
  }, [level]);

  useEffect(() => {
    if (!level || !worlds) {
      setWorldIds([]);
    } else {
      const newWorldIds = [];

      for (let i = 0; i < worlds.length; i++) {
        const levels = worlds[i].levels as Types.ObjectId[];

        if (levels.includes(level._id)) {
          newWorldIds.push(worlds[i]._id.toString());
        }
      }

      setWorldIds(newWorldIds);
    }
  }, [level, worlds]);

  function onSubmit() {
    // TODO: show an error message for invalid input
    if (points > 10) {
      return;
    }

    setIsLoading(true);
    toast.loading(level ? 'Updating level...' : 'Adding level...');

    fetch(level ? `/api/level/${level._id}` : '/api/level', {
      method: level ? 'PUT' : 'POST',
      body: JSON.stringify({
        authorNote: authorNote,
        name: name,
        points: points,
        worldIds: worldIds,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        closeModal();
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error adding level');
    }).finally(() => {
      toast.dismiss();
      toast.success(level ? 'Updated' : 'Added');
      setIsLoading(false);
    });
  }

  function onPointsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.currentTarget.value);

    setPoints(isNaN(value) ? 0 : value);
  }

  function onWorldIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const worldId = e.currentTarget.value;

    setWorldIds(prevWorldIds => {
      const newWorldIds = [...prevWorldIds];
      const index = newWorldIds.indexOf(worldId);

      if (index > -1) {
        newWorldIds.splice(index, 1);
      } else {
        newWorldIds.push(worldId);
      }

      return newWorldIds;
    });
  }

  const worldDivs: JSX.Element[] = [];

  if (worlds) {
    for (let i = 0; i < worlds.length; i++) {
      const worldId = worlds[i]._id.toString();

      worldDivs.push(<div key={i}>
        <input
          checked={worldIds.includes(worldId)}
          name='world'
          onChange={onWorldIdChange}
          style={{
            margin: '0 10px 0 0',
          }}
          type='checkbox'
          value={worldId}
        />
        {worlds[i].name}
      </div>);
    }
  }

  const isUsersLevel = level?.userId._id === user.user?._id || level?.userId === user.user?._id;
  const tw = useTextAreaWidth();
  const titlePrefix = `${level ? 'Edit' : 'New'} Level`;

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title={!isUsersLevel ? 'Add Level...' : titlePrefix}
    >
      <>
        { isUsersLevel && (
          <div>

            <label className='font-bold' htmlFor='name'>Name:</label>
            <input
              name='name'
              onChange={e => setName(e.target.value)}
              placeholder={`${level ? 'Edit' : 'Add'} name...`}
              required
              style={{
                color: 'rgb(0, 0, 0)',
                margin: 8,
              }}
              type='text'
              value={name}
            />
          </div>
        ) }
        { isUsersLevel && (
          <div>
            <label className='font-bold' htmlFor='points'>Difficulty (0-10):</label>
            <input
              name='points'
              onChange={onPointsChange}
              pattern='[0-9]*'
              required
              style={{
                color: 'rgb(0, 0, 0)',
                margin: 8,
              }}
              type='text'
              value={points}
            />
          </div>
        ) }
        { isUsersLevel && (
          <div>
            <label className='font-bold' htmlFor='authorNote'>Author Note:</label>
            <br/>
            <textarea
              name='authorNote'
              onChange={e => setAuthorNote(e.target.value)}
              placeholder={`${level ? 'Edit' : 'Add'} author note...`}
              rows={4}
              style={{
                color: 'rgb(0, 0, 0)',
                margin: '8px 0',
                resize: 'none',
                width: tw,
              }}
              value={authorNote}
            />
          </div>
        ) }
        {worldDivs.length === 0 ? <div>You do not have any collections.<br/><Link href='/create'><a className='underline'>Create</a></Link> a collection.</div> :
          <div>
            <span className='font-bold'>Worlds:</span>
            {worldDivs}
          </div>
        }
      </>
    </Modal>
  );
}
