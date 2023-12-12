export const GTM_ID = 'GTM-WBDLFZ5T';

export const pageview = (url: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).dataLayer.push({
    event: 'pageview',
    page: url,
  });
};
