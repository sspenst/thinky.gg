import { unstable_serialize } from 'swr';

export default function getSWRKey(input: RequestInfo, init?: RequestInit) {
  return unstable_serialize([input, init]);
}
