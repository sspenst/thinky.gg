import Link from 'next/link';

export default class LinkInfo {
  href?: string;
  text: string;

  constructor(
    text: string,
    href?: string,
  ) {
    this.text = text;
    this.href = href;
  }

  toElement() {
    return this.href ?
      <Link className='underline' href={this.href}>
        {this.text}
      </Link>
      :
      this.text;
  }
}
