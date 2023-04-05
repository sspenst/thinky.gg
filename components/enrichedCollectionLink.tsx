import Collection from '@root/models/db/collection';
import Link from 'next/link';
import React from 'react';
import { EnrichedLevel } from '../models/db/level';

interface CollectionLinkProps {
  collection: Collection;
  onClick?: () => void;
}

export default function EnrichedCollectionLink({ collection, onClick }: CollectionLinkProps) {
  return (
    <Link
      className='font-bold underline'
      href={`/collection/${collection.slug}`}
      onClick={onClick}
      passHref
      prefetch={false}
    >
      {collection.name}
    </Link>
  );
}
