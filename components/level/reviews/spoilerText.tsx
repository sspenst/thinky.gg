import StyledTooltip from '@root/components/page/styledTooltip';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

export function SpoilerText({ text }: { text: string }) {
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
  const Spoiler = ({ children }: { children: string }) => {
    const [visible, setVisible] = useState(false);
    const toggleVisibility = () => setVisible(!visible);

    // Generate a unique ID for the tooltip, this should not change across re-renders
    const [tooltipId] = useState(() => `spoiler-tooltip-${Math.random().toString(36).substring(2, 10)}`);

    let spoilerToolTipText = visible ? 'Click to hide spoiler' : 'Click to show spoiler';
    // notAllowed is true if every character in text is a *
    const notAllowed = children.slice(2, -2).replace(/\*/g, '') === '';

    if (notAllowed) {
      spoilerToolTipText = 'You must solve this level to view this spoiler';
    }

    return (
      <>
        <span
          data-tooltip-id={tooltipId}
          data-tooltip-content={spoilerToolTipText}
          style={{
            backgroundColor: visible ? '#ff03' : '#000',
            padding: '0 0.12em',
            // round the corners of the spoiler text
            borderRadius: '0.25em',
            color: visible ? '#fff' : '#000',
            cursor: 'pointer'
          }}
          onClick={() => {
            if (notAllowed) {
              toast.error(spoilerToolTipText);
            } else {
              toggleVisibility();
            }
          }
          }>
          {children.slice(2, -2)}
        </span>
        <StyledTooltip id={tooltipId} />
      </>
    );
  };

  return (
    <span>
      {parts.map((part, index) =>
        part.startsWith('||') && part.endsWith('||') ? (
          <Spoiler key={index}>{part}</Spoiler>
        ) : (
          part
        )
      )}
    </span>
  );
}
