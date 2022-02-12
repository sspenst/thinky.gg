import { useState } from 'react';
import React from 'react';
import LevelDataType from '../Constants/LevelDataType';
import Nav from '../Nav';

export default function Editor() {
  function getSquareColor(d: string) {
    switch (d) {
      case LevelDataType.Wall:
        return 'rgb(38, 38, 38)';
      case LevelDataType.Block:
        return 'rgb(110, 80, 60)';
      case LevelDataType.End:
        return 'rgb(229, 229, 229)';
      case LevelDataType.Start:
        return 'rgb(244, 114, 182)';
      default:
        return 'rgb(16, 185, 129)';
    }
  }

  const [x, setX] = useState<number>();
  const [y, setY] = useState<number>();
  const [paint, setPaint] = useState('0');
  const [data, setData] = useState<string[] | undefined>(undefined);

  const grid = [];

  if (x !== undefined && y !== undefined && data !== undefined && dimensionsValid(x, y)) {
    for (let j = 0; j < y; j++) {
      const squares = [];
  
      for (let i = 0; i < x; i++) {
        squares.push(
          <div
            key={i}
            style={{
              width: '30px',
              height: '30px',
              borderWidth: data[j*x+i] === LevelDataType.Hole ? '6px' : '1px',
              borderColor: 'black',
              backgroundColor: getSquareColor(data[j*x+i])
            }}
            onClick={() => updateData(i, j)}
          >
          </div>
        );
      }
  
      grid.push(
        <div key={j} style={{display: 'flex'}}>
          {squares}
        </div>
      );
    }
  }

  function updateData(i: number, j: number) {
    if (x !== undefined && data !== undefined) {
      data[j*x+i] = paint;
      setData(data.slice());
    }
  }

  function dimensionsValid(x: number, y: number) {
    return x > 0 && x <= 20 && y > 0 && y <= 20;
  }

  function updateDimensions(x: number | undefined, y: number | undefined) {
    setX(x);
    setY(y);
    if (x !== undefined && y !== undefined) {
      if (!dimensionsValid(x, y)) {
        return;
      }
      setData(Array(y*x).fill('0'));
    }
  }

  function getText() {
    if (!data) {
      return;
    }
    return data.join('');
  }

  return (
    <div>
      <Nav/>
      <div>
        <span>x</span>
        <input
          type='text'
          value={x}
          onChange={e => updateDimensions(Number(e.target.value), y)}
          style={{color: 'rgb(0, 0, 0)'}}
        >
        </input>
      </div>
      <div>
        <span>y</span>
        <input
          type='text'
          value={y}
          onChange={e => updateDimensions(x, Number(e.target.value))}
          style={{color: 'rgb(0, 0, 0)'}}
        >
        </input>
      </div>
      <div>
        <select
          value={paint}
          onChange={e => setPaint(e.target.value)}
          style={{color: 'rgb(0, 0, 0)'}}
        >
          <option value='0'>Default</option>
          <option value='1'>Wall</option>
          <option value='2'>Block</option>
          <option value='3'>End</option>
          <option value='4'>Start</option>
          <option value='5'>Hole</option>
        </select>
      </div>
      {getText()}
      {grid}
    </div>
  );
}