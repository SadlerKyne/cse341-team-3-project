import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: false,
            trim: true,
        },
    },
    { _id: false }
);

const bookingSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        scheduleId: {
            type: Number,
            required: true,
        },
        tripId: {
            type: String,
            required: true,
            trim: true,
        },
        ticketClass: {
            type: String,
            required: true,
            trim: true,
        },
        selectedDay: {
            type: String,
            required: true,
            trim: true,
        },
        passengers: {
            type: [passengerSchema],
            validate: {
                validator: (passengers) => passengers.length > 0,
                message: "A booking needs at least one passenger",
            },
        },
    },
    {
        timestamps: true,
    }
);

const booking = mongoose.model("Booking", bookingSchema);

export default booking;
