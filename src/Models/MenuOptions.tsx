import { To } from 'react-router-dom';

export default class MenuOptions {
  author: string | undefined;
  escapeTo: To | undefined;
  nextLevelId: string | undefined;
  prevLevelId: string | undefined;
  title: string;

  constructor(
    title: string,
    escapeTo: To | undefined = undefined,
    author: string | undefined = undefined,
    nextLevelId: string | undefined = undefined,
    prevLevelId: string | undefined = undefined,
  ) {
    this.author = author;
    this.escapeTo = escapeTo;
    this.nextLevelId = nextLevelId;
    this.prevLevelId = prevLevelId;
    this.title = title;
  }
}
