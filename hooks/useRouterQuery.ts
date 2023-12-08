import { useRouter } from 'next/router';
import { ParsedUrlQuery, ParsedUrlQueryInput } from 'querystring';

export function useRouterQuery() {
  const router = useRouter();

  /**
   * router.push to the same path with new query params
   * optionally removes default query params for a cleaner url
   */
  function routerQuery(query: ParsedUrlQuery, defaultQuery?: ParsedUrlQuery) {
    // only add non-default query params for a clean URL
    const q: ParsedUrlQueryInput = {};

    for (const prop in query) {
      if (!defaultQuery || query[prop] !== defaultQuery[prop]) {
        q[prop] = query[prop];
      }
    }

    // remove subdomain from query and path
    delete q['subdomain'];
    const pathname = router.pathname.replace('/[subdomain]', '');

    return router.push({
      pathname: pathname,
      query: q,
    });
  }

  return routerQuery;
}
