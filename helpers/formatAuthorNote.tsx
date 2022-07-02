import React from 'react';

export default function formatAuthorNote(authorNote: string) {
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {authorNote.replace(/<\/?[^>]+(>|$)/g, '')}
    </span>
  );
}
