export default class LevelOptions {
  nextLevelId: string | undefined;
  prevLevelId: string | undefined;

  constructor(
    nextLevelId: string | undefined = undefined,
    prevLevelId: string | undefined = undefined,
  ) {
    this.nextLevelId = nextLevelId;
    this.prevLevelId = prevLevelId;
  }
}
