import bcrypt from 'bcrypt';
import { Role } from './schemas/roles.js';
import { User } from './schemas/users.js';

const createUser = async (name, username, email, password) => {
  const customer = await Role.findOne({ name: 'customer' });
  if (!customer) {
    throw new Error('Default role not found');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    username: username.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role: customer._id
  });

  return user._id.toString();
};

const findUserByEmail = async (email) => {
  return User.findOne({ email: email.trim().toLowerCase() }).populate('role');
};

const verifyPassword = async (password, passwordHash) => {
  return bcrypt.compare(password, passwordHash);
};

export { createUser, findUserByEmail, verifyPassword };
