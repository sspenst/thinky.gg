import Dimensions from '../constants/dimensions';
import Link from 'next/link';
import React from 'react';

export default class LinkInfo {
  text: string;
  href?: string;

  constructor(
    text: string,
    href?: string,
  ) {
    this.text = text;
    this.href = href;
  }

  toElement() {
    return (this.href ? 
      <Link href={this.href} passHref>
        <a
          className={'underline'}
          style={{
            lineHeight: Dimensions.MenuHeight + 'px',
          }}
        >
          {this.text}
        </a>
      </Link>
      :
      this.text
    );
  }
}
