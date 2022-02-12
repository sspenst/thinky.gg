// represents a document from the pathology.packs collection
export default interface Pack {
  _id: string;
  creatorId: string;
  name: string;
  psychopathId: number | undefined;
}
