export default class MenuOptions {
  author: string | undefined;
  escapeId: string | undefined;
  escapePathname: string | undefined;
  nextLevelId: string | undefined;
  prevLevelId: string | undefined;
  title: string;

  constructor(
    title: string,
    escapePathname: string | undefined = undefined,
    escapeId: string | undefined = undefined,
    author: string | undefined = undefined,
    nextLevelId: string | undefined = undefined,
    prevLevelId: string | undefined = undefined,
  ) {
    this.author = author;
    this.escapeId = escapeId;
    this.escapePathname = escapePathname;
    this.nextLevelId = nextLevelId;
    this.prevLevelId = prevLevelId;
    this.title = title;
  }
}
