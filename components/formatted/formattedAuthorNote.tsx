interface FormattedAuthorNoteProps {
  authorNote: string;
}

export default function FormattedAuthorNote({ authorNote }: FormattedAuthorNoteProps) {
  return (
    <span className='break-words whitespace-pre-wrap'>
      {authorNote.replace(/<\/?[^>]+(>|$)/g, '')}
    </span>
  );
}
