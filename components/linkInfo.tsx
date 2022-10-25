import Link from 'next/link';
import React from 'react';
import Dimensions from '../constants/dimensions';

export default class LinkInfo {
  href?: string;
  onClick?: () => void;
  text: string;

  constructor(
    text: string,
    href?: string,
    onClick?: () => void,
  ) {
    this.text = text;
    this.href = href;
    this.onClick = onClick;
  }

  toElement() {
    return this.href ?
      <Link
        href={this.href}
        passHref
        className={'underline'}
        style={{
          lineHeight: Dimensions.MenuHeight + 'px',
        }}>

        {this.text}

      </Link>
      :
      this.onClick ?
        <button
          className={'underline'}
          onClick={this.onClick}
          style={{
            lineHeight: Dimensions.MenuHeight + 'px',
          }}
        >
          {this.text}
        </button>
        :
        this.text;
  }
}
