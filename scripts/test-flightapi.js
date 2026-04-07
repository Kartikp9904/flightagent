const axios = require('axios');

const FLIGHT_API_KEY = "69d4a0f7ac4b69189b7aa02f";

async function testFlightApi() {
    console.log("--- Testing FlightAPI.io ---");
    // Format: https://api.flightapi.io/onewaytrip/[KEY]/[ORIGIN]/[DESTINATION]/[DATE]/[ADULTS]/[CHILDREN]/[INFANTS]/[CABIN]/[CURRENCY]
    const url = `https://api.flightapi.io/onewaytrip/${FLIGHT_API_KEY}/NYC/PAR/2026-05-10/1/0/0/Economy/USD`;

    try {
        console.log(`Hitting URL: https://api.flightapi.io/onewaytrip/[KEY]/NYC/PAR/2026-05-10/1/0/0/Economy/USD`);
        const response = await axios.get(url);
        const data = response.data;

        console.log("Success! Data keys:", Object.keys(data));
        console.log("Itineraries count:", data.itineraries?.length);
        
        if (data.itineraries?.length > 0) {
            console.log("First Itinerary sample:", JSON.stringify(data.itineraries[0], null, 2));
            console.log("First Carrier sample:", JSON.stringify(data.carriers?.[0], null, 2));
        } else {
            console.log("No flights found for this route.");
        }
    } catch (error) {
        console.error("FlightAPI.io Failed:", error.message);
        if (error.response) {
            console.error("Error Status:", error.response.status);
            console.error("Error Data:", error.response.data);
        }
    }
}

testFlightApi();
