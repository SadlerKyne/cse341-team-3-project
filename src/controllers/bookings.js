import mongoose from "mongoose";
import { getDb } from "../db/connect.js";
import { generateConfirmationCode } from "../includes/helpers.js";
import { parsePaging } from "../includes/pagination.js";
import {
  createBooking,
  getBookingById,
  getBookingsByEmail,
  getBookingsPage,
} from "../models/bookings.js";

const TICKET_CLASSES = ["standard", "premium", "first"];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Turns "YYYY-MM-DD" into a Date at midnight UTC, or null if it is not a real date.
const parseDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  // Rejects dates like 2026-02-30 that JavaScript would roll over into March.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? date : null;
};

// GET /api/bookings
export async function getAllBookings(req, res) {
  const paging = parsePaging(req.query);
  if (paging.error) {
    return res.status(400).json({ error: paging.error });
  }
  const { page, limit } = paging;
  const { ticketClass, from, to } = req.query;
  const fromDate = from === undefined ? null : parseDate(from);
  const toDate = to === undefined ? null : parseDate(to);

  if (ticketClass !== undefined && !TICKET_CLASSES.includes(ticketClass)) {
    return res.status(400).json({ error: "ticketClass must be standard, premium, or first" });
  }
  if ((from !== undefined && !fromDate) || (to !== undefined && !toDate)) {
    return res.status(400).json({ error: "from and to must be dates in YYYY-MM-DD format" });
  }
  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({ error: "from must be on or before to" });
  }

  const filter = {};
  if (ticketClass) {
    filter.ticketClass = ticketClass;
  }
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) {
      filter.createdAt.$gte = fromDate;
    }
    if (toDate) {
      // Include the whole "to" day by stopping at midnight of the next day.
      filter.createdAt.$lt = new Date(toDate.getTime() + ONE_DAY_MS);
    }
  }

  try {
    const { bookings, total } = await getBookingsPage(filter, page, limit);

    return res.status(200).json({
      data: bookings,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      filters: { ticketClass: ticketClass ?? null, from: from ?? null, to: to ?? null },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);

    return res.status(500).json({
      error: "Failed to fetch bookings",
    });
  }
}

// GET /api/bookings/mine
export async function getMyBookings(req, res) {
  try {
    const bookings = await getBookingsByEmail(req.user.email);

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);

    return res.status(500).json({
      error: "Failed to fetch bookings",
    });
  }
}

// GET /trips/booking/:scheduleId
export async function bookingPage(req, res, next) {
  try {
    const { scheduleId } = req.params;

    const db = getDb();
    const schedule = await db.collection("schedules").findOne({ id: Number(scheduleId) });
    const trip = schedule && await db.collection("trips").findOne({ id: schedule.tripId });

    if (!schedule || !trip) {
      return res.status(404).render("errors/404", {
        title: "Page Not Found",
        error: "Schedule not found",
        stack: "",
      });
    }

    const ticketClasses = await db.collection("ticketClasses").find({}).toArray();
    const ticketOptions = ticketClasses.map((ticketClass) => ({
      class: ticketClass.class,
      name: ticketClass.name,
      price: trip.distance * ticketClass.pricePerKm,
      amenities: ticketClass.amenities,
      description: ticketClass.description,
    }));

    return res.render("trips/book", {
      title: "Book Trip",
      schedule,
      ticketOptions,
    });
  } catch (error) {
    return next(error);
  }
}

// POST /trips/book
export async function processBookingRequest(req, res, next) {
  const { scheduleId, tripId, ticketClass, selectedDay, passengers } = req.body;

  try {
    // Build the booking from known fields only so the form cannot add extra fields.
    const booking = await createBooking({
      id: generateConfirmationCode(),
      scheduleId: Number(scheduleId),
      tripId,
      ticketClass,
      selectedDay,
      // The form sends passengers[0][firstName], ... which usually arrives as an
      // array, but can arrive as an object, so accept both.
      passengers: Object.values(passengers ?? {}),
    });

    return res.redirect(`/trips/confirmation/${booking.id}`);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      error.status = 400;
      error.message = "The booking is missing required information. Please go back and check the form.";
    }
    return next(error);
  }
}

// GET /trips/confirmation/:bookingId
export async function bookingConfirmationPage(req, res, next) {
  try {
    const { bookingId } = req.params;

    const booking = await getBookingById(bookingId);

    if (!booking) {
      return res.status(404).render("errors/404", {
        title: "Page Not Found",
        error: "Booking not found",
        stack: "",
      });
    }

    return res.render("trips/confirm", {
      title: "Trip Confirmation",
      booking,
    });
  } catch (error) {
    return next(error);
  }
}

// GET /bookings-admin
export function bookingsAdminPage(req, res) {
  return res.render("bookings", {
    title: "Bookings Admin",
  });
}
