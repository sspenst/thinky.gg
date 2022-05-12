export default function cleanAuthorNote(authorNote: string) {
    const authorNoteWithoutTags = authorNote.replace(/<\/?[^>]+(>|$)/g, '');
    return authorNoteWithoutTags;
}
