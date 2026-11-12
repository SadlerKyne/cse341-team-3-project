import trip from "./schemas/trips.js";

export async function getTripById(id) {
  return trip.findOne({ id }).lean();
}

export async function getAllTrips() {
  return trip.find({}).lean();
}