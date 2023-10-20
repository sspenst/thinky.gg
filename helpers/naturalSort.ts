interface ObjectWithName {
  name: string;
}

export default function naturalSort(objects: ObjectWithName[]) {
  return objects.sort((a, b) => {
    return a.name?.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}
