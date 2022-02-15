import React from 'react';
import { Link } from 'react-router-dom';

interface SelectProps {
  ids: string[];
  options: JSX.Element[];
  pathname: string;
}

export default function Select(props: SelectProps) {
  const buttons = [];
  for (let i = 0; i < props.options.length; i++) {
    buttons.push(
      <Link key={i} to={{
        pathname: `/${props.pathname}`,
        search: `id=${props.ids[i]}`,
      }}>
        <button
          className={`border-2 font-semibold`}
          style={{
            width: '200px',
            height: '100px',
            verticalAlign: 'top',
          }}>
          {props.options[i]}
        </button>
      </Link>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
