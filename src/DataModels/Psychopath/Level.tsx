// represents a document from the psychopath.levels collection
export default interface Level {
  _id: string;
  inPathology: boolean; // NB: computed field
  name: string;
  psychopathId: number;
  worldId: string;
}
