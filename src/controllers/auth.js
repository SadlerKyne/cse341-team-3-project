import { createUser, findUserByEmail, verifyPassword } from '../models/auth.js';

const register = async (req, res, next) => {
  const { name, email, password } = req.body ?? {};

  if (![name, email, password].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).render('register', {
      title: 'Register',
      error: 'Please provide your name, email, and password.'
    });
  }

  try {
    await createUser(name.trim(), email, password);
    return res.redirect('/login');
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).render('register', {
        title: 'Register',
        error: 'An account with that email already exists.'
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
        role: user.role.name
      };

      return req.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
        }
        return res.redirect('/');
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
