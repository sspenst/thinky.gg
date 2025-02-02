import React, { FC, JSX } from 'react';
import toast from 'react-hot-toast';
import {
  FacebookIcon,
  FacebookShareButton,
  LinkedinIcon,
  LinkedinShareButton,
  RedditIcon,
  RedditShareButton,
  TwitterIcon,
  TwitterShareButton,
} from 'react-share';

interface ShareBarProps {
  platforms?: ('Facebook' | 'Linkedin' | 'Twitter' | 'Reddit' | 'Copy' | 'Generic')[];
  url: string;
  quote: string;
  size?: number;
}

const ShareBar: FC<ShareBarProps> = ({ platforms = ['Generic', 'Copy', 'Facebook', 'Linkedin', 'Twitter', 'Reddit'], url, quote, size = 32 }) => {
  const copyToClipboard = (e: React.MouseEvent) => {
    navigator.clipboard.writeText(url);
    toast.success('Copied to clipboard!');
    e.preventDefault();
  };

  const handleGenericShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Share this URL',
        url,
      });
    }
  };

  const buttonMap: Record<string, JSX.Element> = {
    Copy: (
      <button onClick={copyToClipboard} style={{ fontSize: `${size}px` }}>
        <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='currentColor' className='bi bi-clipboard bg-gray p-1' viewBox='0 0 16 16'>
          <path d='M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z' />
          <path d='M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z' />
        </svg>
      </button>
    ),
    Reddit: (
      <RedditShareButton url={url} title={quote}>
        <RedditIcon size={size} />
      </RedditShareButton>
    ),
    Facebook: (
      <FacebookShareButton url={url}>
        <FacebookIcon size={size} />
      </FacebookShareButton>
    ),
    Linkedin: (
      <LinkedinShareButton url={url} summary={quote}>
        <LinkedinIcon size={size} />
      </LinkedinShareButton>
    ),
    Twitter: (
      <TwitterShareButton url={url} title={quote}>
        <TwitterIcon size={size} />
      </TwitterShareButton>
    ),
    Generic: (
      <button className='md:hidden' onClick={handleGenericShare} style={{ fontSize: `${size}px` }}>
        <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='currentColor' className='bi bi-share-fill bg-gray p-1' viewBox='0 0 16 16'>
          <path d='M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z' />
        </svg>
      </button>
    ),
  };

  return (
    <div>
      {platforms.map((platform) => {
        return (<span key={platform}>{buttonMap[platform]}</span>);
      })}
    </div>
  );
};

export default ShareBar;
