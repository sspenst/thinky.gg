import Level from '@root/models/db/level';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '.';

interface ShareModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  onSocialShare: (platform: string) => void;
}

export default function ShareModal({ closeModal, isOpen, level, onSocialShare }: ShareModalProps) {
  const [levelUrl, setLevelUrl] = useState('');

  const shareMessages = [
    `This puzzle has me completely stumped. Anyone else want to try &quot;${level.name}&quot;?`,
    `Found a mind-bender that's actually challenging. &quot;${level.name}&quot; on Thinky.gg`,
    `Okay this one took me way too long to solve. Your turn: &quot;${level.name}&quot;`,
    `New personal record: spent 45 minutes on this puzzle called &quot;${level.name}&quot;`,
    `Plot twist: this puzzle is harder than it looks. &quot;${level.name}&quot; on Thinky.gg`,
    `Finally cracked &quot;${level.name}&quot; after way too many attempts. Worth it though`,
    `This puzzle broke my brain in the best way possible. &quot;${level.name}&quot;`,
    `Zero regrets about the time I just spent on &quot;${level.name}&quot;. Pure genius`,
    `Whoever designed &quot;${level.name}&quot; clearly enjoys watching people suffer (respectfully)`,
    `Just solved &quot;${level.name}&quot; and immediately questioned everything I know about logic`,
    `Fair warning: &quot;${level.name}&quot; will consume your next hour. You've been warned`,
    `The satisfaction of finally solving &quot;${level.name}&quot; hits different`,
    `Thought I was smart until I met &quot;${level.name}&quot;. Humbling experience`,
    `&quot;${level.name}&quot; just taught me patience I didn't know I had`,
    `This puzzle game is dangerously addictive. Currently stuck on &quot;${level.name}&quot;`,
    `Productivity officially ruined by &quot;${level.name}&quot;. No complaints though`,
    `Some puzzles are hard. &quot;${level.name}&quot; is... something else entirely`,
    `Just discovered my new obsession. &quot;${level.name}&quot; on Thinky.gg`,
    `The level name &quot;${level.name}&quot; doesn't prepare you for what's coming`,
    `Successfully avoided all responsibilities by solving &quot;${level.name}&quot; instead`
  ];

  const redditTitles = [
    `This puzzle completely destroyed me. Can anyone solve &quot;${level.name}&quot;?`,
    `Spent way too long on this brain teaser: &quot;${level.name}&quot;`,
    `Anyone else find &quot;${level.name}&quot; unreasonably difficult?`,
    `Finally beat &quot;${level.name}&quot; after countless attempts. Worth sharing`,
    `This puzzle game is seriously underrated. Check out &quot;${level.name}&quot;`,
    `&quot;${level.name}&quot; broke my brain and I loved every second of it`
  ];

  const linkedInMessages = [
    `Just tackled &quot;${level.name}&quot; - fascinating problem-solving challenge that really makes you think`,
    `Discovered an excellent brain training exercise: &quot;${level.name}&quot; on Thinky.gg`,
    `Taking a break from work with some strategic thinking. &quot;${level.name}&quot; delivered`,
    `Impressive puzzle design in &quot;${level.name}&quot;. Great example of elegant complexity`,
    `Found a surprisingly engaging logic challenge: &quot;${level.name}&quot;`,
    `&quot;${level.name}&quot; - excellent mental exercise for anyone who enjoys problem-solving`
  ];

  const getRandomMessage = (messages: string[]) => {
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const shareTitle = getRandomMessage(shareMessages);
  const redditTitle = getRandomMessage(redditTitles);
  const linkedInText = getRandomMessage(linkedInMessages);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLevelUrl(`${window.location.origin}/level/${level.slug}`);
    }
  }, [level.slug]);

  const handleShare = (platform: string, url: string) => {
    onSocialShare(platform);

    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(levelUrl);
      toast.dismiss();
      toast.success('Link copied to clipboard');
    }
  };

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2} stroke='white' className='w-6 h-6'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z' />
            </svg>
          </div>
          <span>Share Level</span>
        </div>
      }
    >
      <div className='flex flex-col gap-6'>
        <div className='text-center'>
          <div className='text-lg font-semibold mb-2'>🧩 &quot;{level.name}&quot;</div>
          <div className='text-sm text-color-gray'>
            Challenge your friends with this brain-bending puzzle!
          </div>
        </div>
        <div className='grid grid-cols-2 gap-4'>
          {/* X (Twitter) */}
          <button
            className='flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 border-2 border-transparent transition-all disabled:opacity-50 group'
            disabled={!levelUrl}
            onClick={() => handleShare('X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(levelUrl)}`)}
          >
            <div className='w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0'>
              <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='white'>
                <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
              </svg>
            </div>
            <div className='text-left'>
              <div className='font-semibold'>X</div>
              <div className='text-xs text-color-gray'>Post to timeline</div>
            </div>
          </button>
          {/* Facebook */}
          <button
            className='flex items-center gap-3 p-4 rounded-xl hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent transition-all disabled:opacity-50 group'
            disabled={!levelUrl}
            onClick={() => handleShare('Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(levelUrl)}`)}
          >
            <div className='w-8 h-8 bg-[#1877F2] rounded-lg flex items-center justify-center flex-shrink-0'>
              <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='white'>
                <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
              </svg>
            </div>
            <div className='text-left'>
              <div className='font-semibold'>Facebook</div>
              <div className='text-xs text-color-gray'>Share with friends</div>
            </div>
          </button>
          {/* LinkedIn */}
          <button
            className='flex items-center gap-3 p-4 rounded-xl hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent transition-all disabled:opacity-50 group'
            disabled={!levelUrl}
            onClick={() => handleShare('LinkedIn', `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(`${linkedInText} ${levelUrl}`)}`)}
          >
            <div className='w-8 h-8 bg-[#0A66C2] rounded-lg flex items-center justify-center flex-shrink-0'>
              <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='white'>
                <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
              </svg>
            </div>
            <div className='text-left'>
              <div className='font-semibold'>LinkedIn</div>
              <div className='text-xs text-color-gray'>Share professionally</div>
            </div>
          </button>
          {/* Reddit */}
          <button
            className='flex items-center gap-3 p-4 rounded-xl hover:bg-orange-50 hover:border-orange-200 border-2 border-transparent transition-all disabled:opacity-50 group'
            disabled={!levelUrl}
            onClick={() => handleShare('Reddit', `https://www.reddit.com/submit?url=${encodeURIComponent(levelUrl)}&title=${encodeURIComponent(redditTitle)}`)}
          >
            <div className='w-8 h-8 bg-[#FF4500] rounded-lg flex items-center justify-center flex-shrink-0'>
              <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='white'>
                <path d='M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z' />
              </svg>
            </div>
            <div className='text-left'>
              <div className='font-semibold'>Reddit</div>
              <div className='text-xs text-color-gray'>Post to community</div>
            </div>
          </button>
          {/* Telegram */}
          <button
            className='flex items-center gap-3 p-4 rounded-xl hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent transition-all disabled:opacity-50 group'
            disabled={!levelUrl}
            onClick={() => handleShare('Telegram', `https://t.me/share/url?url=${encodeURIComponent(levelUrl)}&text=${encodeURIComponent(shareTitle)}`)}
          >
            <div className='w-8 h-8 bg-[#0088CC] rounded-lg flex items-center justify-center flex-shrink-0'>
              <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='white'>
                <path d='M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z' />
              </svg>
            </div>
            <div className='text-left'>
              <div className='font-semibold'>Telegram</div>
              <div className='text-xs text-color-gray'>Send to chats</div>
            </div>
          </button>
        </div>
        <div className='border-t border-color-3 pt-6'>
          <button
            className='flex items-center justify-center gap-3 w-full p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50'
            disabled={!levelUrl}
            onClick={handleCopyLink}
          >
            <div className='w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0'>
              <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='currentColor' viewBox='0 0 16 16'>
                <path d='M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z' />
                <path d='M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z' />
              </svg>
            </div>
            <div className='text-left'>
              <div className='font-semibold'>Copy Link</div>
              <div className='text-xs text-color-gray'>Copy URL to clipboard</div>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
}
