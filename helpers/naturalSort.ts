export function naturalSort(arr: any, key: string) {
  return arr.sort((a: any, b: any) => {
    return a[key].localeCompare(b[key], undefined, { numeric: true, sensitivity: 'base' });
  });
}
