import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { To, useSearchParams } from 'react-router-dom';
import Pack from '../DataModels/Pathology/Pack';
import Select from '../Common/Select';
import Dimensions from '../Constants/Dimensions';
import Level from '../DataModels/Pathology/Level';
import LeastMovesHelper from '../Helpers/LeastMovesHelper';
import SelectOption from '../Models/SelectOption';
import SelectOptionStats from '../Models/SelectOptionStats';
import Page from '../Common/Page';

export default function PackPage() {
  const [escapeTo, setEscapeTo] = useState<To>();
  const [levels, setLevels] = useState<Level[]>([]);
  const [moves, setMoves] = useState<{[levelId: string]: number}>();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<SelectOptionStats[]>([]);
  const [title, setTitle] = useState<string>();
  const packId = searchParams.get('id');

  useEffect(() => {
    async function getPack() {
      if (!packId) {
        return;
      }

      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `packs?id=${packId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const packs: Pack[] = await response.json();
      const pack = packs[0];

      setEscapeTo(`/creator?id=${pack.creatorId}`);
      setTitle(pack.name);
    }

    async function getLevels() {
      if (!packId) {
        return;
      }

      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `levels?packId=${packId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const levels: Level[] = await response.json();
      levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
      setLevels(levels);
    }

    async function getMoves() {
      fetch(process.env.REACT_APP_SERVICE_URL + 'moves', {credentials: 'include'})
      .then(async function(res) {
        setMoves(await res.json());
      });
    }

    getPack();
    getLevels();
    getMoves();
  }, [packId]);

  useEffect(() => {
    if (levels.length === 0 || !moves) {
      return;
    }

    setStats(LeastMovesHelper.levelStats(levels, moves));
  }, [levels, moves]);

  const getOptions = useCallback(() => {
    const options = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];

      options.push(new SelectOption(
        stats.length === 0 ? undefined : stats[i],
        level.name,
        `/level?id=${level._id}`,
        Dimensions.OptionHeightLarge,
        level.author,
      ));
    }
    
    return options;
  }, [levels, stats]);

  return (
    <Page escapeTo={escapeTo} title={title}>
      <Select
        options={getOptions()}
      />
    </Page>
  );
}
