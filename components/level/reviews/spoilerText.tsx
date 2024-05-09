import StyledTooltip from '@root/components/page/styledTooltip';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface SpoilerTextProps {
  id: string;
  text: string | undefined;
}

export function SpoilerText({ id, text }: SpoilerTextProps) {
  if (!text) {
    return null;
  }

  // Parse the text to identify spoiler parts
  const parseText = () => {
    const parts = [];
    const regex = /(\|\|.+?\|\|)/g;
    let lastIdx = 0;

    text.replace(regex, (match, _p1, index) => {
      // Push preceding non-spoiler text, if any
      if (index > lastIdx) {
        parts.push(text.slice(lastIdx, index));
      }

      // Push the spoiler text
      parts.push(match);
      lastIdx = index + match.length;

      return match;
    });

    // Push remaining non-spoiler text, if any
    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }

    return parts;
  };

  const parts = parseText();

  // Spoiler component to handle visibility toggling
  const Spoiler = ({ children, index }: { children: string, index: number }) => {
    const [visible, setVisible] = useState(false);
    const toggleVisibility = () => setVisible(!visible);
    const tooltipId = `spoiler-tooltip-${id}-${index}`;

    let spoilerToolTipText = visible ? 'Click to hide spoiler' : 'Click to show spoiler';
    // notAllowed is true if every character in text is a *
    const notAllowed = children.slice(2, -2).replace(/\*/g, '') === '';

    if (notAllowed) {
      spoilerToolTipText = 'You must solve this level to view this spoiler';
    }

    const backgroundColor = visible ? undefined : '#000';

    return (
      <>
        <span
          className='select-none'
          data-tooltip-id={tooltipId}
          data-tooltip-content={spoilerToolTipText}
          style={{
            backgroundColor: backgroundColor,
            padding: '0 0.12em',
            // round the corners of the spoiler text
            borderRadius: '0.25em',
            color: !visible ? backgroundColor : undefined,
            cursor: 'pointer'
          }}
          onClick={() => {
            if (notAllowed) {
              toast.error(spoilerToolTipText);
            } else {
              toggleVisibility();
            }
          }}
        >
          {children.slice(2, -2)}
        </span>
        <StyledTooltip id={tooltipId} />
      </>
    );
  };

  return (
    <span className='whitespace-pre-wrap'>
      {parts.map((part, index) =>
        part.startsWith('||') && part.endsWith('||') ? (
          <Spoiler index={index} key={index}>{part}</Spoiler>
        ) : (
          part
        )
      )}
    </span>
  );
}
