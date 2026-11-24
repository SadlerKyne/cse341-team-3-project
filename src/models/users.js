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

// Returns one page of users sorted by username, plus the total number of matches.
export async function getUsersPage(filter, page, limit) {
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
