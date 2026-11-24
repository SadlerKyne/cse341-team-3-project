import booking from "./schemas/bookings.js";

export async function createBooking(data) {
  const created = await booking.create(data);
  return created.toObject();
}

// Returns one page of bookings, newest first, plus the total number of matches.
export async function getBookingsPage(filter, page, limit) {
  const [bookings, total] = await Promise.all([
    booking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    booking.countDocuments(filter)
  ]);
  return { bookings, total };
}

export async function getBookingsByEmail(email) {
  return booking.find({ "passengers.email": email }).sort({ createdAt: -1 }).lean();
}

export async function getBookingById(id) {
  return booking.findOne({ id }).lean();
}
