// Reads page and limit from the query string.
// Returns { page, limit }, or { error } when either value is invalid.
export function parsePaging(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);

  if (!Number.isInteger(page) || page < 1) {
    return { error: 'page must be a whole number of 1 or more' };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return { error: 'limit must be a whole number from 1 to 50' };
  }
  return { page, limit };
}
