import { createUser, findUserByEmail, verifyPassword } from '../models/auth.js';

const register = async (req, res, next) => {
  const { name, username, email, password } = req.body ?? {};

  if (![name, username, email, password].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).render('register', {
      title: 'Register',
      error: 'Please provide your name, username, email, and password.'
    });
  }

  try {
    await createUser(name.trim(), username, email, password);
    return res.redirect('/login');
  } catch (error) {
    if (error.code === 11000) {
      const field = error.keyPattern?.username ? 'username' : 'email';
      return res.status(409).render('register', {
        title: 'Register',
        error: `An account with that ${field} already exists.`
      });
    }
    return next(error);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body ?? {};

  if (![email, password].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).render('login', {
      title: 'Sign In',
      error: 'Please provide your email and password.'
    });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || !user.role || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).render('login', {
        title: 'Sign In',
        error: 'Invalid email or password.'
      });
    }

    return req.session.regenerate((error) => {
      if (error) {
        return next(error);
      }

      req.session.user = {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role.name
      };

      return req.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
        }
        return res.redirect(user.role.name === 'admin' ? '/admin' : '/dashboard');
      });
    });
  } catch (error) {
    return next(error);
  }
};

const logout = (req, res, next) => {
  return req.session.destroy((error) => {
    if (error) {
      return next(error);
    }
    res.clearCookie('connect.sid');
    return res.redirect('/');
  });
};

export { login, logout, register };
