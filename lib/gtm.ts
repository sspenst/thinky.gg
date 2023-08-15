export const GTM_ID = 'GTM-WBDLFZ5T';

export const pageview = (url: string) => {
  (window as any).dataLayer.push({
    event: 'pageview',
    page: url,
  });
};
