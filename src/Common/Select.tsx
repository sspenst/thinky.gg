import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './index.css';
import Dimensions from '../Constants/Dimensions';

interface SelectProps {
  colors: string[];
  height: number;
  ids: string[];
  optionHeight?: number;
  options: JSX.Element[];
  pathname: string;
  width: number;
}

export default function Select(props: SelectProps) {
  const [opacity, setOpacity] = useState<number[]>(Array(props.options.length).fill(0));
  const minPadding = 12;
  const options = [];
  const optionHeight = props.optionHeight === undefined ? 100 : props.optionHeight;
  const optionWidth = 200;
  const optionsPerRow = Math.floor(props.width / (2 * minPadding + optionWidth));
  const padding = (props.width - optionWidth * optionsPerRow) / (2 * optionsPerRow);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    for (let i = 0; i < props.options.length; i++) {
      const x = i % optionsPerRow;
      const y = Math.floor(i / optionsPerRow);
      const timeout = (x + y) * 30;

      timeouts.push(setTimeout(() => {
        setOpacity(prevOpacity => {
          const opacity = [...prevOpacity];
          opacity[i] = 1;
          return opacity;
        });
      }, timeout));
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [props.options.length, optionsPerRow]);

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
            className={'border-2 rounded-md font-semibold scale'}
            style={{
              borderColor: props.colors[i],
              color: props.colors[i],
              height: optionHeight,
              width: optionWidth,
            }}
            tabIndex={-1}
          >
            {props.options[i]}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        height: props.height,
        overflowY: 'scroll',
        position: 'fixed',
        top: Dimensions.MenuHeight,
        width: props.width,
      }}
      className={'hide-scroll'}
    >
      {options}
    </div>
  );
}
