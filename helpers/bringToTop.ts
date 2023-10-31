/* eslint-disable @typescript-eslint/no-explicit-any */
interface Criteria {
  [key: string]: any;
}

/**
 * bring to top should be used to bring an object to the top of the list
  * @param objects the list of objects to be sorted
  * @param criteria the key value crtieria (eg: name: 'test') that needs to be brought to the top of the list
 */
export function bringToTop(arr: Array<{ [key: string]: any }>, criteria: Criteria): Array<{ [key: string]: any }> {
  const key = Object.keys(criteria)[0];
  const value = criteria[key];
  let top: any[] = [];
  let i = 0;

  while (i < arr.length) {
    if (arr[i][key] === value) {
      top = top.concat(arr.splice(i, 1));
    } else {
      i++;
    }
  }

  return top.concat(arr);
}
