// represents a document from the pathology.levels collection
export default interface Level {
  _id: string;
  author: string;
  data: string;
  height: number;
  leastMoves: number;
  name: string;
  packId: string;
  psychopathId: number | undefined;
  width: number;
}
