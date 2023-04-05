import React from 'react';

export default function Footer() {
  return (
    <div className='flex flex-col p-6 gap-6' style={{
      borderTop: '1px solid',
      borderColor: 'var(--bg-color-3)',
    }}>
      <div className='w-full flex justify-center gap-6 text-sm text-center'>
        <div className='flex flex-col w-32'>
          <h3 className='font-bold mb-2 text-lg' style={{ color: 'var(--color-gray)' }}>Social</h3>
          <a className='hover:underline' href='https://discord.gg/j6RxRdqq4A' rel='noreferrer' target='_blank'>
            Discord
          </a>
          <a className='hover:underline' href='https://twitter.com/pathologygame' rel='noreferrer' target='_blank'>
            Twitter
          </a>
          <a className='hover:underline' href='https://www.instagram.com/pathologygame' rel='noreferrer' target='_blank'>
            Instagram
          </a>
        </div>
        <div className='flex flex-col w-32'>
          <h3 className='font-bold mb-2 text-lg' style={{ color: 'var(--color-gray)' }}>Connect</h3>
          <a className='hover:underline' href='https://apps.apple.com/app/pathology-block-pushing-game/id1668925562' rel='noreferrer' target='_blank'>
            iOS App
          </a>
          <a className='hover:underline' href='https://play.google.com/store/apps/details?id=com.pathology.gg' rel='noreferrer' target='_blank'>
            Android App
          </a>
          <a className='hover:underline' href='https://github.com/sspenst/pathology' rel='noreferrer' target='_blank'>
            GitHub
          </a>
        </div>
        <div className='flex flex-col w-32'>
          <h3 className='font-bold mb-2 text-lg' style={{ color: 'var(--color-gray)' }}>Admin</h3>
          <a className='hover:underline' href='https://forms.gle/xz3cuXvxFR8hb6un8' rel='noreferrer' target='_blank'>
            Contact Us
          </a>
          <a className='hover:underline' href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub' rel='noreferrer' target='_blank'>
            Privacy Policy
          </a>
          <a className='hover:underline' href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub' rel='noreferrer' target='_blank'>
            Terms of Service
          </a>
        </div>
      </div>
      <div className='text-center text-sm'>
        © {(new Date()).getFullYear()} Pathology.gg
      </div>
    </div>
  );
}
