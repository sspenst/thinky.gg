import classNames from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';
import StyledTooltip from '../page/styledTooltip';

// https://day.js.org/docs/en/customization/relative-time
dayjs.extend(
  relativeTime,
  {
    rounding: Math.floor,
    thresholds: [
      { l: 's', r: 59, d: 'second' },
      { l: 'm', r: 1 },
      { l: 'mm', r: 59, d: 'minute' },
      { l: 'h', r: 1 },
      { l: 'hh', r: 23, d: 'hour' },
      { l: 'd', r: 1 },
      { l: 'dd', r: 27, d: 'day' },
      // NB: weeks are not well-supported by dayjs
      // { l: 'w', r: 1 },
      // { l: 'ww', r: 4, d: 'week' },
      { l: 'M', r: 1 },
      { l: 'MM', r: 11, d: 'month' },
      { l: 'y', r: 1 },
      { l: 'yy', d: 'year' },
    ],
  }
);

interface FormattedDateProps {
  className?: string;
  date?: Date;
  style?: React.CSSProperties;
  ts?: number;
}

export default function FormattedDate({ className, date, style, ts }: FormattedDateProps) {
  // convert ts to date
  if (!date) {
    if (!ts) {
      return null;
    } else {
      date = new Date(ts * 1000);
    }
  } else {
    // ensure dates from the db are actually dates
    date = new Date(date);
  }

  return (<>
    <span
      className={classNames('text-sm whitespace-nowrap truncate', className)}
      data-tooltip-content={date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })}
      data-tooltip-id={`date-${ts}`}
      style={{
        color: 'var(--color-gray)',
        ...style,
      }}
      suppressHydrationWarning
    >
      {dayjs(date).fromNow()}
    </span>
    <StyledTooltip id={`date-${ts}`} />
  </>);
}
