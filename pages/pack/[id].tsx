import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useRouter } from 'next/router';
import Pack from '../../models/data/pathology/pack';
import Select from '../../components/select';
import Dimensions from '../../constants/dimensions';
import Level from '../../models/data/pathology/level';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import Page from '../../components/page';

export default function PackPage() {
  const [escapeHref, setEscapeHref] = useState<string>();
  const [levels, setLevels] = useState<Level[]>([]);
  const [moves, setMoves] = useState<{[levelId: string]: number}>();
  const router = useRouter();
  const [stats, setStats] = useState<SelectOptionStats[]>([]);
  const [title, setTitle] = useState<string>();
  const { id } = router.query;

  useEffect(() => {
    async function getPack() {
      if (!id) {
        return;
      }

      const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `packs?id=${id}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const packs: Pack[] = await response.json();
      const pack = packs[0];

      setEscapeHref(`/creator/${pack.creatorId}`);
      setTitle(pack.name);
    }

    async function getLevels() {
      if (!id) {
        return;
      }

      const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `levels?packId=${id}`);

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
      fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'moves', {credentials: 'include'})
      .then(async function(res) {
        setMoves(await res.json());
      });
    }

    getPack();
    getLevels();
    getMoves();
  }, [id]);

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
        `/level/${level._id}`,
        stats.length === 0 ? undefined : stats[i],
        level.name,
        Dimensions.OptionHeightLarge,
        level.author,
      ));
    }
    
    return options;
  }, [levels, stats]);

  return (
    <Page needsAuth={true} escapeHref={escapeHref} title={title}>
      <Select
        options={getOptions()}
      />
    </Page>
  );
}
