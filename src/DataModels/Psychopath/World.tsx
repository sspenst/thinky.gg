// represents a document from the psychopath.worlds collection
export default interface World {
  _id: string;
  inPathology: boolean; // NB: computed field
  name: string;
  psychopathId: number;
  universeId: string;
}
