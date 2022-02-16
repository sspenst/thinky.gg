import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Dimensions from '../Constants/Dimensions';
import './select.css';

interface SelectProps {
  height: number;
  ids: string[];
  options: JSX.Element[];
  pathname: string;
  width: number;
}

export default function Select(props: SelectProps) {
  const optionWidth = 200;
  const minPadding = 12;
  const rowOptions = Math.floor(props.width / (2 * minPadding + optionWidth));
  const padding = (props.width - optionWidth * rowOptions) / (2 * rowOptions);
  const options = [];

  const [opacity, setOpacity] = useState<number[]>([]);

  useEffect(() => {
    if (opacity.length === props.options.length) {
      return;
    }

    setOpacity(Array(props.options.length).fill(0));

    for (let i = 0; i < props.options.length; i++) {
      const x = i % rowOptions;
      const y = Math.floor(i / rowOptions);
      const timeout = (x + y) * 50;

      setTimeout(() => {
        setOpacity(prevOpacity => {
          const opacity = [...prevOpacity];
          opacity[i] = 1;
          return opacity;
        });
      }, timeout);
    }
  }, [opacity.length, props.options.length, rowOptions]);

  for (let i = 0; i < props.options.length; i++) {
    options.push(
      <div
        key={i}
        style={{
          float: 'left',
          opacity: opacity[i] === undefined ? 0 : opacity[i],
          padding: `${minPadding}px ${padding}px`,
          transition: 'opacity 0.4s'
        }}
      >
        <Link to={{
          pathname: `/${props.pathname}`,
          search: `id=${props.ids[i]}`,
        }}>
          <button
            className={'border-2 rounded-md font-semibold option'}
            style={{
              width: optionWidth,
              height: '100px',
              verticalAlign: 'top',
            }}>
            {props.options[i]}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      height: props.height,
      overflowY: 'scroll',
      position: 'fixed',
      top: Dimensions.MenuHeight,
      width: props.width,
    }}>
      {options}
    </div>
  );
}
