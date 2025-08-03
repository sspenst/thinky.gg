import { GameId } from '@root/constants/GameId';
import { AppContext } from '@root/contexts/appContext';
import useUrl from '@root/hooks/useUrl';
import Collection from '@root/models/db/collection';
import Link from 'next/link';
import { useContext } from 'react';

interface CollectionLinkProps {
  collection: Collection;
  gameId?: GameId;
  onClick?: () => void;
}

export default function FormattedCollectionLink({ collection, gameId, onClick }: CollectionLinkProps) {
  const { game } = useContext(AppContext);
  const getUrl = useUrl();

  const href = getUrl(collection.gameId || gameId || game.id, `/collection/${collection.slug}`);

  return (
    <Link
      className='font-bold underline'
      href={href}
      onClick={onClick}
      passHref
      prefetch={false}
    >
      {collection.name}
    </Link>
  );
}
