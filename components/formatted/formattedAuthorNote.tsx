interface FormattedAuthorNoteProps {
  authorNote: string;
}

export default function FormattedAuthorNote({ authorNote }: FormattedAuthorNoteProps) {
  return (
    <span className='wrap-break-word whitespace-pre-wrap'>
      {authorNote.replace(/<\/?[^>]+(>|$)/g, '')}
    </span>
  );
}
