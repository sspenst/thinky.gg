// represents a document from the pathology.creators collection
export default interface Creator {
  _id: string;
  name: string;
  psychopathId: number | undefined;
}
