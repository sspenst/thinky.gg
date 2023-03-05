import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function useNavigatePrompt(isDirty: boolean) {
  const router = useRouter();

  // https://stackoverflow.com/a/65338027/18087196
  useEffect(() => {
    const confirmationMessage = 'Changes you made will not be saved.';

    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      (e || window.event).returnValue = confirmationMessage;

      return confirmationMessage; // Gecko + Webkit, Safari, Chrome etc.
    };

    const beforeRouteHandler = (url: string) => {
      if (router.pathname !== url && !confirm(confirmationMessage)) {
        // to inform NProgress or something ...
        router.events.emit('routeChangeError');
        // tslint:disable-next-line: no-string-throw
        throw new Error(`Route change to "${url}" was aborted (this error can be safely ignored). See https://github.com/zeit/next.js/issues/2476.`);
      }
    };

    if (isDirty) {
      window.addEventListener('beforeunload', beforeUnloadHandler);
      router.events.on('routeChangeStart', beforeRouteHandler);
    } else {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      router.events.off('routeChangeStart', beforeRouteHandler);
    }

    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      router.events.off('routeChangeStart', beforeRouteHandler);
    };
  }, [isDirty, router.events, router.pathname]);
}
