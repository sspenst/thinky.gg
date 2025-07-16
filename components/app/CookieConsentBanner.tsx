import CookieConsent from 'react-cookie-consent';

export default function CookieConsentBanner() {
  const isEU = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe');

  if (!isEU) {
    return null;
  }

  return (
    <CookieConsent
      buttonClasses='font-semibold'
      buttonStyle={{ borderRadius: '6px', color: 'white', background: '#4CAF50' }}
      buttonText='I understand'
      contentStyle={{ flex: '1' }}
      cookieName='cookie_consent'
      location='top'
      style={{
        background: '#2B373B',
        display: 'flex',
        alignItems: 'center',
        marginTop: 48,
        opacity: '0.9',
      }}
    >
      <div className='text-xs'>
        We use cookies to improve your browsing experience. View our&nbsp;
        <a
          className='hover:underline text-blue-300'
          href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub'
          rel='noreferrer'
          target='_blank'
        >
          privacy policy
        </a>.
      </div>
    </CookieConsent>
  );
}
