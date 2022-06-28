import moment from 'moment';

export default function getFormattedDate(ts: number) {
  const date = new Date(ts * 1000);

  return moment(date).fromNow();
}
