import { CollectionType } from '@root/models/constants/collection';
import Collection from '@root/models/db/collection';

interface ObjectWithName {
  name: string;
}

/**
 * sort an array of objects by name in a natural way
 * @param objects array of objects
 * @param compareFn optional compare function to be used before natural sorting
 * @returns the sorted array
 */
export default function naturalSort<T extends ObjectWithName>(
  objects: T[],
  compareFn?: (a: T, b: T) => number,
) {
  return objects.sort((a, b) => {
    if (compareFn) {
      const compareFnRes = compareFn(a, b);

      if (compareFnRes !== 0) {
        return compareFnRes;
      }
    }

    return a.name?.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// sort play later first
export function playLaterCompareFn(a: Collection, b: Collection) {
  if (a.type === CollectionType.PlayLater && b.type !== CollectionType.PlayLater) {
    return -1;
  }

  if (b.type === CollectionType.PlayLater && a.type !== CollectionType.PlayLater) {
    return 1;
  }

  return 0;
}
