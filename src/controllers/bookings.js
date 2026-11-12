import mongoose from "mongoose";
import { getDb } from "../db/connect.js";
import { generateConfirmationCode } from "../includes/helpers.js";
import {
  createBooking,
  getAllBookings as findAllBookings,
  getBookingById,
} from "../models/bookings.js";

// GET /api/bookings
export async function getAllBookings(req, res) {
  try {
    const bookings = await findAllBookings();

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
