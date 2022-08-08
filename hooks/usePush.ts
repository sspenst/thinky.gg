import type { NextRouter } from 'next/router';
// from https://stackoverflow.com/questions/69203538/useeffect-dependencies-when-using-nextjs-router
import { useRouter } from 'next/router';
import { useRef, useState } from 'react';

export default function usePush(): NextRouter['push'] {
  const router = useRouter();
  const routerRef = useRef(router);

  routerRef.current = router;

  const [{ push }] = useState<Pick<NextRouter, 'push'>>({
    push: path => routerRef.current.push(path),
  });

  return push;
}
