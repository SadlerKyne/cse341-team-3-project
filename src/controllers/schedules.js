import { getSchedulesByTripId } from "../models/schedules.js";
import { getTripById } from "../models/trips.js";

export async function getSchedulesForTrip(req, res) {
  try {
    const { id } = req.params;

    const trip = await getTripById(id);

    if (!trip) {
      return res.status(404).json({
        error: "Trip not found",
      });
    }

    const schedules = await getSchedulesByTripId(id);

    return res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);

    return res.status(500).json({
      error: "Failed to fetch schedules",
    });
  }
}

export async function getSchedulesForTripAndMonth(req, res) {
  try {
    const { id } = req.params;
    const month = Number(req.query.month);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({
        error: "month must be a whole number from 1 to 12",
      });
    }

    const trip = await getTripById(id);

    if (!trip) {
      return res.status(404).json({
        error: "Trip not found",
      });
    }

    const schedules = await getSchedulesByTripId(id, month);

    return res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);

    return res.status(500).json({
      error: "Failed to fetch schedules",
    });
  }
}
