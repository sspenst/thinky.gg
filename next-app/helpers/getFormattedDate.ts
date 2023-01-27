import moment from 'moment';

export default function getFormattedDate(ts: number) {
  const date = new Date(ts * 1000);

  moment.relativeTimeRounding(Math.floor);

  return moment(date).fromNow();
}
