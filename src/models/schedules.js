import schedule from "./schemas/schedules.js";
import trip from "./schemas/trips.js";

// month is optional (1-12). A trip only runs in its operatingMonths, so if the
// trip does not run in that month there are no schedules to show.
export async function getSchedulesByTripId(tripId, month) {
  if (month !== undefined) {
    const runsThatMonth = await trip.exists({ id: tripId, operatingMonths: month });

    if (!runsThatMonth) {
      return [];
    }
  }

  return schedule.find({ tripId }).sort({ departureTime: 1 }).lean();
}
