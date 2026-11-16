import booking from "./schemas/bookings.js";

export async function createBooking(data) {
  const created = await booking.create(data);
  return created.toObject();
}

export async function getAllBookings() {
  return booking.find({}).sort({ createdAt: -1 }).lean();
}

export async function getBookingById(id) {
  return booking.findOne({ id }).lean();
}
