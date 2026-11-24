import mongoose from 'mongoose';
import { Role } from './schemas/roles.js';
import { User } from './schemas/users.js';

// The API never returns the password hash.
const toPublicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role?.name
});

// Builds the MongoDB filter for the user list.
// q is escaped so characters like . or * are searched as plain text.
async function buildUserFilter({ id, role, q }) {
  const filter = {};
  if (id) {
    filter._id = id;
  }
  if (role) {
    filter.role = (await Role.findOne({ name: role }))?._id ?? null;
  }
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: pattern }, { username: pattern }, { email: pattern }];
  }
  return filter;
}

// Returns one page of users sorted by username, plus the total number of matches.
export async function getUsersPage(criteria, page, limit) {
  const filter = await buildUserFilter(criteria);
  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('role')
      .sort({ username: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);
  return { users: users.map(toPublicUser), total };
}

export async function getUserById(id) {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }
  const user = await User.findById(id).populate('role').lean();
  return user ? toPublicUser(user) : null;
}

export async function updateUser(id, { name, username, email, role }) {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }
  const changes = { name, username, email };
  if (role) {
    changes.role = (await Role.findOne({ name: role }))._id;
  }
  const user = await User.findByIdAndUpdate(id, changes, { new: true }).populate('role').lean();
  return user ? toPublicUser(user) : null;
}

export async function deleteUser(id) {
  if (!mongoose.isValidObjectId(id)) {
    return false;
  }
  const result = await User.deleteOne({ _id: id });
  return result.deletedCount === 1;
}
