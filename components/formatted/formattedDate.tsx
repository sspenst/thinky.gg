import classNames from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';
import StyledTooltip from '../page/styledTooltip';

dayjs.extend(relativeTime);

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
      data-tooltip-content={date.toUTCString()}
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
