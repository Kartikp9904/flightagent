import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, whatsapp, flight, type } = await req.json();

    if (type === "email") {
      if (!email || !flight) {
        return NextResponse.json({ error: "Missing email or flight details." }, { status: 400 });
      }

      const { data, error } = await resend.emails.send({
        from: "Flight Agent <onboarding@resend.dev>",
        to: email,
        subject: "Cheapest Flight Found ✈️",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #6366f1;">Flight Agent: Best Deal Found!</h2>
            <p>We found a great flight for you from <strong>${flight.airline}</strong>.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
              <p><strong>Route:</strong> ${flight.airline} (${flight.flightNumber})</p>
              <p><strong>Departure:</strong> ${flight.departureTime}</p>
              <p><strong>Arrival:</strong> ${flight.arrivalTime}</p>
              <p><strong>Duration:</strong> ${flight.duration}</p>
              <p><strong>Stops:</strong> ${flight.stops} (${flight.stopLocations.join(", ") || "Non-stop"})</p>
              <h3 style="color: #0f172a;">Price: ${flight.price} ${flight.currency}</h3>
            </div>
            <a href="${flight.bookingLink}" style="display: inline-block; margin-top: 20px; background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Book Now</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from your Intelligent Flight Agent.</p>
          </div>
        `,
      });

      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    if (type === "whatsapp") {
      // Logic for Twilio / WhatsApp will go here later
      console.log("WhatsApp Notification Request:", whatsapp, flight);
      return NextResponse.json({ success: true, message: "WhatsApp notification queued (simulated)." });
    }

    return NextResponse.json({ error: "Invalid notification type." }, { status: 400 });
  } catch (error: any) {
    console.error("Notification API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send notification." }, { status: 500 });
  }
}
