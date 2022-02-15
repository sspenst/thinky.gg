export default class MenuOptions {
  escapeId: string | undefined;
  escapePathname: string | undefined;
  nextLevelId: string | undefined;
  prevLevelId: string | undefined;
  subtitle: string | undefined;
  title: string;

  constructor(
    title: string,
    subtitle: string | undefined = undefined,
    escapeId: string | undefined = undefined,
    escapePathname: string | undefined = undefined,
    nextLevelId: string | undefined = undefined,
    prevLevelId: string | undefined = undefined,
  ) {
    this.escapeId = escapeId;
    this.escapePathname = escapePathname;
    this.nextLevelId = nextLevelId;
    this.prevLevelId = prevLevelId;
    this.subtitle = subtitle;
    this.title = title;
  }
}
