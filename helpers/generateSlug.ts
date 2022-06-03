export default function generateSlug(userName: string, levelName: string) {
  return (userName + '/' + levelName.replace(/\s+/g, '-')).toLowerCase();
}
