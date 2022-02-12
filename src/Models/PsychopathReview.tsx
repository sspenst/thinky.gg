// represents a document from the psychopath.reviews collection
export default interface PsychopathReview {
  _id: string;
  levelId: string;
  name: string; // NB: computed field
  psychopathId: number;
  score: number;
  text: string;
  ts: number;
  universeId: string;
}
