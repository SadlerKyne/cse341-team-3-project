import mongoose from 'mongoose';
import { Role } from './schemas/roles.js';
import { User } from './schemas/users.js';

// The API never returns the password hash.
const toPublicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role?.name
});

export async function getAllUsers() {
  const users = await User.find({}).populate('role').lean();
  return users.map(toPublicUser);
}

export async function getUserById(id) {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }
  const user = await User.findById(id).populate('role').lean();
  return user ? toPublicUser(user) : null;
}

export async function updateUser(id, { name, email, role }) {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }
  const changes = { name, email };
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
