export default function generateSlug(userName: string, levelName: string) {

  let slug = levelName;

  slug = slug.toLowerCase();
  slug = slug.replace(/[^a-z0-9 ]+/g, '');
  slug = slug.trim().replace(/\s+/g, '-');

  return userName.toLowerCase() + '/' + slug;
}
