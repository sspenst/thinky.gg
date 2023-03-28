import Link from 'next/link';
import React from 'react';
import Modal from '.';

interface AboutModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function AboutModal({ closeModal, isOpen }: AboutModalProps) {
  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'About'}
    >
      <>
        <div>
          {'Pathology is a recreation of '}
          <a
            className='text-blue-300'
            href='https://k2xl.com'
            rel='noreferrer'
            target='_blank'
          >
            k2xl
          </a>
          {'\'s Psychopath 2.'}
        </div>
        <div>
          {'Discuss the game on the '}
          <a
            className='text-blue-300'
            href='https://discord.gg/j6RxRdqq4A'
            rel='noreferrer'
            target='_blank'
          >
            Pathology Discord
          </a>
          .
        </div>
        <div>
          {'Pathology is open source! Check out the code on '}
          <a
            className='text-blue-300'
            href='https://github.com/sspenst/pathology'
            rel='noreferrer'
            target='_blank'
          >
            GitHub
          </a>
          .
        </div>
        <p className='mt-4'>For any questions please contact <Link className='text-blue-300' href='mailto:help@pathology.gg'>help@pathology.gg</Link>.</p>
        <div className='mt-5'>
          <a
            className='text-blue-300'
            href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub'
            rel='noreferrer'
            target='_blank'
          >
            Privacy Policy
          </a>
        </div>
        <div>
          <a
            className='text-blue-300'
            href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub'
            rel='noreferrer'
            target='_blank'
          >
            Terms of Service
          </a>
        </div>
      </>
    </Modal>
  );
}
