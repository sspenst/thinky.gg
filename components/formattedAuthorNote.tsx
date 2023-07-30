import React from 'react';

export default function formattedAuthorNote(authorNote: string) {
  return (
    <span className='break-words whitespace-pre-wrap'>
      {authorNote.replace(/<\/?[^>]+(>|$)/g, '')}
    </span>
  );
}
