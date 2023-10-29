/**
 * bring to top should be used to bring an object to the top of the list
  * @param objects the list of objects to be sorted
  * @param criteria the key value crtieria (eg: name: 'test') that needs to be brought to the top of the list
 */

interface Criteria {
  [key: string]: any;
}

export function bringToTop(arr: Array<{ [key: string]: any }>, criteria: Criteria): Array<{ [key: string]: any }> {
  const key = Object.keys(criteria)[0];
  const value = criteria[key];
  let insertIdx = 0;

  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === value) {
      const temp = arr[i];

      arr[i] = arr[insertIdx];
      arr[insertIdx] = temp;
      insertIdx++;
    }
  }

  return arr;
}
