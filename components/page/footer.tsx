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
  return (
    <footer className='footer flex flex-col p-10 gap-10 w-full bg-1' style={{
      borderTop: '1px solid var(--bg-color-3)',
    }}>
      <div className='flex justify-center gap-6 text-sm text-center'>
        <div className='flex flex-col gap-4 text-left w-32'>
          <span className='font-medium'>
            Social
          </span>
          <ExternalLink href='https://discord.gg/j6RxRdqq4A'>
            Discord
          </ExternalLink>
          <ExternalLink href='https://www.facebook.com/profile.php?id=61556141295912'>
            Facebook
          </ExternalLink>
          <ExternalLink href='https://twitter.com/thinkygg'>
            Twitter
          </ExternalLink>
          <ExternalLink href='https://www.instagram.com/thinkypuzzlegames'>
            Instagram
          </ExternalLink>
        </div>
        <div className='flex flex-col gap-4 text-left w-32'>
          <span className='font-medium'>
            Mobile
          </span>
          <ExternalLink href='https://apps.apple.com/app/pathology-block-pushing-game/id1668925562'>
            App Store
          </ExternalLink>
          <ExternalLink href='https://play.google.com/store/apps/details?id=com.pathology.gg'>
            Google Play
          </ExternalLink>
        </div>
        <div className='flex flex-col gap-4 text-left w-32'>
          <span className='font-medium'>
            Resources
          </span>
          <ExternalLink href='mailto:help@thinky.gg'>
            Contact
          </ExternalLink>
          <ExternalLink href='https://github.com/sspenst/pathology'>
            GitHub
          </ExternalLink>
          <ExternalLink href='https://github.com/sspenst/pathology/wiki'>
            Wiki
          </ExternalLink>
          <ExternalLink href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub'>
            Privacy Policy
          </ExternalLink>
          <ExternalLink href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub'>
            Terms of Service
          </ExternalLink>
        </div>
      </div>
      <div className='text-center text-sm' style={{ color: 'var(--color-gray)' }}>
        © 2024 <ExternalLink href='https://thinky.gg'>
          Thinky.gg
        </ExternalLink>
      </div>
    </footer>
  );
}
