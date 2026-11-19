// GET /dashboard
export function userDashboardPage(req, res) {
  return res.render('dashboard', { title: 'My Dashboard' });
}

// GET /admin
export function adminDashboardPage(req, res) {
  return res.render('admin-dashboard', { title: 'Admin Dashboard' });
}
