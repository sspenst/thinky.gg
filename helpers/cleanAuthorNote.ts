export default function cleanAuthorNote(authorNote: string) {
  return authorNote.replace(/<\/?[^>]+(>|$)/g, '');
}
