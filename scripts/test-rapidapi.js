const axios = require('axios');

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const TRIPADVISOR_HOST = process.env.TRIPADVISOR_HOST;
const KAYAK_HOST = process.env.KAYAK_HOST;

async function testTripAdvisor() {
    console.log("--- Testing TripAdvisor ---");
    const variations = [
        "flights/search-one-way"
    ];

    for (const variant of variations) {
        const url = `https://${TRIPADVISOR_HOST}/${variant}`;
        console.log(`Trying TripAdvisor Polling Search: ${variant}...`);
        try {
            // Test with the same logic as fetchTripAdvisorFlights
            let response = await axios.get(url, {
                params: {
                    airportFrom: 'NYC',
                    airportTo: 'PAR',
                    departDate: '2026-05-10',
                    adults: 1,
                    currency: "USD"
                },
                headers: {
                    'x-rapidapi-key': RAPID_API_KEY,
                    'x-rapidapi-host': TRIPADVISOR_HOST
                }
            });
            
            let data = response.data;
            let searchKey = data.meta?.searchKey;
            console.log("Initial Search Key:", searchKey);

            let attempts = 0;
            while (attempts < 3) {
                console.log(`Poll Attempt ${attempts + 1}...`);
                if (data.meta?.isComplete || (data.data?.itineraries?.length || 0) > 0) {
                    console.log("SUCCESS! Found flights:", data.data?.itineraries?.length);
                    break;
                }
                await new Promise(r => setTimeout(r, 3000));
                response = await axios.get(url, {
                    params: {
                        airportFrom: 'NYC',
                        airportTo: 'PAR',
                        departDate: '2026-05-10',
                        searchKey: searchKey,
                        adults: 1,
                        currency: "USD"
                    },
                    headers: {
                        'x-rapidapi-key': RAPID_API_KEY,
                        'x-rapidapi-host': TRIPADVISOR_HOST
                    }
                });
                data = response.data;
                attempts++;
            }
            return;
        } catch (error) {
            console.log(`Failed with ${variant}: ${error.response?.status || error.message}`);
        }
    }
}

async function testKayak() {
    console.log("--- Testing Kayak ---");
    const url = `https://${KAYAK_HOST}/search-flights`;
    try {
        const response = await axios.post(url, {
            origin: 'LAX',
            destination: 'ORL',
            departure_date: '2026-05-15',
            userSearchParams: {
                passengers: ['ADT'],
                sortMode: 'price_a'
            }
        }, {
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': KAYAK_HOST,
                'Content-Type': 'application/json'
            }
        });
        const results = response.data.data?.results || [];
        console.log("Kayak First Result (Detailed):", JSON.stringify(results[0], null, 2));
    } catch (error) {
        if (error.response) {
            console.error("Kayak Failed:", error.response.status, error.response.data);
        } else {
            console.error("Kayak Failed:", error.message);
        }
    }
}

async function runTests() {
    if (!RAPID_API_KEY) {
        console.error("Error: RAPID_API_KEY is missing in .env.local");
        return;
    }
    await testTripAdvisor();
    await testKayak();
}

runTests();
