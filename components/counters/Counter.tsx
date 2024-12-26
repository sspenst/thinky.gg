import { motion, MotionValue, useSpring, useTransform } from 'framer-motion';
import React, { useEffect } from 'react';

const fontSize = 30;
const padding = 15;
const height = fontSize + padding;

export function Counter({ value }: { value: number }) {
  // Convert number to string and remove leading zeros
  const displayValue = value.toString();

  return (
    <div
      style={{ fontSize }}
      className='flex space-x-1 overflow-hidden rounded bg-white px-2 leading-none text-gray-900'
    >
      {displayValue.split('').map((digit, i) => (
        <Digit key={i} place={Math.pow(10, displayValue.length - i - 1)} value={value} />
      ))}
    </div>
  );
}

function Digit({ place, value }: { place: number; value: number }) {
  const valueRoundedToPlace = Math.floor(value / place);
  const animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div style={{ height }} className='relative w-[1ch] tabular-nums border-2 rounded-md p-4 border-gray-500'>
      {[...Array(10).keys()].map((i) => (
        <Number key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  );
}

function Number({ mv, number }: { mv: MotionValue; number: number }) {
  const y = useTransform(mv, (latest) => {
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;

    let memo = offset * height;

    if (offset > 5) {
      memo -= 10 * height;
    }

    return memo;
  });

  return (
    <motion.span
      style={{ y }}
      className='absolute inset-0 flex items-center justify-center'
    >
      {number}
    </motion.span>
  );
}
