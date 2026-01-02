import Image from 'next/image';
import React from 'react';

interface ExternalLinkProps {
  children: React.ReactNode;
  href: string;
}

function ExternalLink({ children, href }: ExternalLinkProps) {
  return (
    <a
      className='hover:underline w-fit'
      href={href}
      rel='noreferrer'
      style={{ color: 'var(--color-gray)' }}
      target='_blank'
    >
      {children}
    </a>
  );
}

export default function Footer() {
  const discordNavLink = (
    <a
      className='w-fit m-2'
      href='https://discord.gg/j6RxRdqq4A'
      rel='noreferrer'
      target='_blank'
    >
      <Image alt='discord' src='/discord.svg?v=1' width='120' height='40' />
    </a>
  );

  const appStoreNavLink = (
    <a
      className='w-fit m-2'
      href='https://apps.apple.com/app/pathology-block-pushing-game/id1668925562'
      rel='noreferrer'
      target='_blank'
    >
      <Image alt='app-store' src='/app-store.svg' width='120' height='40' />
    </a>
  );

  const playStoreNavLink = (
    <a
      className='w-fit m-2'
      href='https://play.google.com/store/apps/details?id=com.pathology.gg'
      rel='noreferrer'
      target='_blank'
    >
      <Image alt='play-store' src='/play-store.svg' width='120' height='35' />
    </a>
  );

  return (
    <footer className='footer flex flex-col items-center gap-4 p-4 w-full bg-1 text-sm'>
      <div className='flex flex-wrap gap-x-4 gap-y-2 items-center justify-center'>
        {discordNavLink}
        {appStoreNavLink}
        {playStoreNavLink}
      </div>
      <div className='flex flex-wrap gap-4 justify-center'>
        <ExternalLink href='mailto:help@thinky.gg'>
          Contact
        </ExternalLink>
        <ExternalLink href='https://github.com/sspenst/thinky.gg'>
          GitHub
        </ExternalLink>
        <ExternalLink href='https://github.com/sspenst/thinky.gg/wiki'>
          Wiki
        </ExternalLink>
        <ExternalLink href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub'>
          Privacy Policy
        </ExternalLink>
        <ExternalLink href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub'>
          Terms of Service
        </ExternalLink>
      </div>
      <div className='text-center text-xs' style={{ color: 'var(--color-gray)' }}>
        © 2026 <ExternalLink href='https://thinky.gg'>
          Thinky.gg
        </ExternalLink>
      </div>
    </footer>
  );
}
