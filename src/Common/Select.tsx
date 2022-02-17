import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Dimensions from '../Constants/Dimensions';
import LocalStorage from '../Models/LocalStorage';
import './select.css';

interface SelectProps {
  height: number;
  ids: string[];
  leastMoves?: number[];
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
      const timeout = (x + y) * 30;

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
    let color = 'rgb(255, 255, 255)';

    if (props.leastMoves !== undefined) {
      const levelMoves = LocalStorage.getLevelMoves(props.ids[i]);
  
      if (levelMoves !== null) {
        color = levelMoves <= props.leastMoves[i] ? 'rgb(0, 200, 0)' : 'rgb(230, 200, 20)';
      }
    }

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
              borderColor: color,
              color: color,
              height: '100px',
              verticalAlign: 'top',
              width: optionWidth,
            }}>
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
