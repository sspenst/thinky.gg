import React from 'react';

export default function formattedAuthorNote(authorNote: string) {
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {authorNote.replace(/<\/?[^>]+(>|$)/g, '')}
    </span>
  );
}
