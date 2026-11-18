const loadSessionUser = (req, res, next) => {
  req.user = req.session?.user ?? null;
  res.locals.user = req.user;
  return next();
};

const isLoggedIn = (req) => Boolean(req.user);
const hasRole = (req, roleName) => req.user?.role === roleName;

const requireApiLogin = (req, res, next) => {
  if (!isLoggedIn(req)) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  return next();
};

const requirePageLogin = (req, res, next) => {
  if (!isLoggedIn(req)) {
    return res.redirect('/login');
  }
  return next();
};

const requireApiRole = (roleName) => (req, res, next) => {
  if (!isLoggedIn(req)) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (!hasRole(req, roleName)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
};

const requirePageRole = (roleName) => (req, res, next) => {
  if (!isLoggedIn(req)) {
    return res.redirect('/login');
  }
  if (!hasRole(req, roleName)) {
    return res.status(403).render('errors/403', {
      title: 'Forbidden',
      message: 'You do not have permission to access this page.'
    });
  }
  return next();
};

export {
  loadSessionUser,
  requireApiLogin,
  requireApiRole,
  requirePageLogin,
  requirePageRole
};
