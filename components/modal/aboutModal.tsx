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
            className='underline'
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
            className='underline'
            href='https://discord.gg/j6RxRdqq4A'
            rel='noreferrer'
            target='_blank'
          >
            k2xl Discord
          </a>
          .
        </div>
        <div>
          {'Pathology is open source! Check out the code on '}
          <a
            className='underline'
            href='https://github.com/sspenst/pathology'
            rel='noreferrer'
            target='_blank'
          >
            GitHub
          </a>
          .
        </div>
        <div className='mt-5'>
          <a
            className='underline'
            href='https://k2xl.com/privacy_policy'
            rel='noreferrer'
            target='_blank'
          >
            Privacy Policy
          </a>
        </div>
        <div>
          <a
            className='underline'
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
