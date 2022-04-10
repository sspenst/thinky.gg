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
        <button
          className={'underline'}
          style={{
            height: Dimensions.MenuHeight,
          }}
        >
          {this.text}
        </button>
      </Link>
      :
      this.text
    );
  }
}
