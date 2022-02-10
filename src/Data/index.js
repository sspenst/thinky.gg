import { useEffect, useState } from 'react';
import Nav from '../Nav';
import LevelSelect from './LevelSelect';
import ReviewSelect from './ReviewSelect';
import UniverseSelect from './UniverseSelect';
import WorldSelect from './WorldSelect';

export default function Data() {
  const [levelId, setLevelId] = useState(undefined);
  const [levels, setLevels] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [universeId, setUniverseId] = useState(undefined);
  const [universes, setUniverses] = useState([]);
  const [worldId, setWorldId] = useState(undefined);
  const [worlds, setWorlds] = useState([]);
  const sortByName = (a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
  const sortByTs = (a, b) => a.ts > b.ts ? 1 : -1;

  // fetch universes from the database
  useEffect(() => {
    async function getUniverses() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `psychopath/universes`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const universes = await response.json();
      universes.sort(sortByName);
      setUniverses(universes);
    }
  
    getUniverses();
  
    return;
  }, [universes.length]);

  // fetch worlds from the database
  useEffect(() => {
    async function getWorlds() {
      if (!universeId) {
        return;
      }

      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `psychopath/worlds/${universeId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const worlds = await response.json();
      worlds.sort(sortByName);
      setWorlds(worlds);
    }
  
    getWorlds();
  
    return;
  }, [universeId]);

  // fetch levels from the database
  useEffect(() => {
    async function getLevels() {
      if (!worldId) {
        return;
      }

      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `psychopath/levels/${worldId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const levels = await response.json();
      levels.sort(sortByName);
      setLevels(levels);
    }
  
    getLevels();
  
    return;
  }, [worldId]);

  // fetch reviews from the database
  useEffect(() => {
    async function getReviews() {
      if (!levelId) {
        return;
      }

      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `psychopath/reviews/${levelId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const reviews = await response.json();
      reviews.sort(sortByTs);
      setReviews(reviews);
    }
  
    getReviews();
  
    return;
  }, [levelId]);

  if (!universeId) {
    return (
      <>
        <Nav/>
        <UniverseSelect
          universes={universes}
          setUniverseId={setUniverseId}
        />
      </>
    );
  } else if (!worldId) {
    return (
      <WorldSelect
        goToUniverseSelect={() => {
          setUniverseId(undefined);
          setWorlds([]);
        }}
        worlds={worlds}
        setWorldId={setWorldId}
      />
    );
  } else if (!levelId) {
    return (
      <LevelSelect
        goToWorldSelect={() => {
          setWorldId(undefined);
          setLevels([]);
        }}
        levels={levels}
        setLevelId={setLevelId}
      />
    );
  } else {
    return (
      <ReviewSelect
        goToLevelSelect={() => {
          setLevelId(undefined);
          setReviews([]);
        }}
        reviews={reviews}
      />
    );
  }
}
