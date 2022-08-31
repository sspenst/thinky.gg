import Role from '../constants/role';
import User from '../models/db/user';

export default function getCollectionUserIds(user: User) {
  const collectionUserIds: (string | undefined)[] = [user._id.toString()];

  if (user.roles.includes(Role.CURATOR)) {
    // NB: official collections have an undefined userId
    collectionUserIds.push(undefined);
  }

  return collectionUserIds;
}
