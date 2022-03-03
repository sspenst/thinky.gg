export default class LevelOptions {
  author: string | undefined;
  nextLevelId: string | undefined;
  prevLevelId: string | undefined;

  constructor(
    author: string | undefined = undefined,
    nextLevelId: string | undefined = undefined,
    prevLevelId: string | undefined = undefined,
  ) {
    this.author = author;
    this.nextLevelId = nextLevelId;
    this.prevLevelId = prevLevelId;
  }
}
