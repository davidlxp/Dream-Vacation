/**
 * Author: Xinpeng Liu 
 * Email: xinpengl@andrew.cmu.edu
 * Code Last Modified: April 26, 2023
 * 
 * Script contains functions for generating random hotel and flight data/schedule.
 */

// Necessary dependencies
import geolib from 'geolib';
import fs from 'fs';

// JSON file names
const flightsFile = 'flights.json';
const hotelsFile = 'hotels.json';

//---------------------------------------//
// Variables related to flight generation 
//---------------------------------------//

// A pool of origin or destination airports
const airports = {
    'JFK': { latitude: 40.6413, longitude: -73.7781 },
    'LAX': { latitude: 33.9416, longitude: -118.4085 },
    'LHR': { latitude: 51.4694, longitude: -0.4503 },
    'NRT': { latitude: 35.7639, longitude: 140.3864 },
    'SYD': { latitude: -33.9499, longitude: 151.1814 }
};

// Max number of stops
const maxStops = 2;

// The extra hours each stop will add to the total flight time
const extraHoursPerStop = 3;

/* Having stop is not preferrable in traveling. Thus, I estimate 
 * that adding one more stop will make the ticket x% cheaper based on the original price */
const stopDiscountRate = 0.1;

// Cost per km of flight
const costPerKm = 0.15;

// Average flight speed (km per hour)
const flightSpeed = 850;

// The earliest and latest departure time (in 24 hours scale)
const minFlightTime = 6;
const maxFlightTime = 22;

//---------------------------------------//
// Variables related to hotel generation 
//---------------------------------------//

// An object that maps airports from above to cities and country
const airportsAddress = {
    'JFK': {
        city: 'New York City',
        country: 'United States',
    },
    'LAX': {
        city: 'Los Angeles',
        country: 'United States',
    },
    'LHR': {
        city: 'London',
        country: 'United Kingdom',
    },
    'NRT': {
        city: 'Tokyo',
        country: 'Japan',
    },
    'SYD': {
        city: 'Sydney',
        country: 'Australia',
    },
};

// A pool of random street addresses
const streetAddresses = ["123 Main Street", "King's First Blvd", "9970 Creepy Road", "Garden Street",
    "Diamond Fourth Avenue", "666 Sky Blvd", "707 Heaven Street", "999 Mountain Road", "1234 Rainbow Road"];

// A pool of hotels first name
const hotelFirstNames = ["Golden", "Emerald", "Bluebell", "Starlight", "Sapphire", "Blue Beach", "Grand",
    "Royal", "Regal", "Luxury", "Plaza", "Elite", "Palace", "Majestic", "Emperor", "Imperial", "Quartz",
    "Granite", "Marble", "Jade", "Ivory", "Platinum", "Titanium", "Copper", "Gold", "Silver", "Pearl", "Crystal"];

// A pool of hotels last name
const hotelLastNames = ["Hotel", "Inn", "Resort", "Suites", "Lodge", "Motel", "Retreat", "Oasis", "House", "Shelter"];

// A pool of amenities
const amenitiesPool = ["Free Wi-Fi", "Swimming pool", "Fitness center",
    "Restaurant", "Bar", "Room service"];

// Max and Min of hotel rating 
const maxRating = 10;
const minRating = 5;

// Max and Min of hotel stars
const maxStars = 5;
const minStars = 3;

// Max and Min of hotel price based on the number of stars
const priceRanges = {
    3: { min: 50, max: 150 },
    4: { min: 100, max: 250 },
    5: { min: 200, max: 500 }
}

//------------------------------------------------//
// Core functions for generating flights and hotels 
//------------------------------------------------//

/**
 * @brief Function for generating random flights between airports and fill a JSON file 
 * in the project directory. It will create 5 flights between each pair of airports. 
 * Note that, LAX->JFK and JFK->LAX are two different pairs.
 */
function generateFlights(req, res, next) {

    // Number of airports
    let len = Object.keys(airports).length;

    // An array of all flights randomly created
    const flights = [];

    // Loop through all pairs
    for (let i = 0; i < len; ++i) {
        for (let j = 0; j < len; ++j) {

            // Skip the origin and destination are the same
            if (i == j) continue;

            // Create 5 flights between each pair
            for (let k = 0; k < 5; ++k) {
                flights.push(getOneFlight(Object.keys(airports)[i], Object.keys(airports)[j]));
            }
        }
    }

    // Print the flights generated
    console.log(flights);

    // Write the flights to a JSON file
    writeToJson(flights, flightsFile);

    // Return to the client
    res.status(200).send({ "message": `Successfully re-generated JSON file that contains ${flights.length} flights!` })
}

/**
 * Function generates random hotels and write to a JSON file
 * @param {*} res 
 * @param {*} req 
 * @param {*} next 
 */
function generateHotels(req, res, next) {

    // Number of airports as destinations
    let len = Object.keys(airportsAddress).length;

    // An array of all hotels randomly created
    const hotels = [];

    // Loop through all destinations
    for (let i = 0; i < len; ++i) {

        // Get the airport name
        const airport = Object.keys(airportsAddress)[i];

        // Create 5 hotels for one airport destination
        for (let j = 0; j < 5; ++j) {
            hotels.push(getOneHotel(airport));
        }
    }

    // Print the hotels generated
    console.log(hotels);

    // Write the hotels to a JSON file
    writeToJson(hotels, hotelsFile);

    // Return to the client
    res.status(200).send({ "message": `Successfully re-generated JSON file that contains ${hotels.length} hotels!` })
}

//--------------------------------------------------//
// Helper functions for generating flights and hotels 
//--------------------------------------------------//

/**
 * @brief Helper function to generate a filght for a pair of airports
 * @param {*} fromAirport - The origin city
 * @param {*} toAirport - The destination city
 */
function getOneFlight(fromAirport, toAirport) {

    // Randomly generate number of stops
    let numStops = Math.floor(Math.random() * (maxStops + 1));

    /* Randomly generate the stops in a flight.
     * A pool of middle airports. Since it's fake data, I don't want to use real airport as middle points, 
     * beacuse it would bring weird flight routing like: SYD -> ORD -> NRT. There's no reason to stop in 
     * the USA when flying from Sydney to Tokyo. Fake airport can mitigate this issue */
    let stops = [];
    for (let i = 0; i < numStops; ++i) {

        // Find a stop that is not in the stops array
        let fakeAirport = getFakeMidAiport();
        while (stops.includes(fakeAirport)) {
            fakeAirport = getFakeMidAiport();
        }

        // Add the stop to the stops array
        stops.push(fakeAirport);
    }

    // Get the distance between the origin and destination (In km)
    let distance = geolib.getDistance(airports[fromAirport], airports[toAirport]) / 1000;

    // Calculate hours needed, taking hours caused by extra stops into account
    let hours = distance / flightSpeed;
    hours = Math.ceil(hours + numStops * extraHoursPerStop);

    /* Randomly generate departure time. The common departureTime is between 6am - 10pm */
    let dTimeNum = Math.floor(Math.random() * (maxFlightTime - minFlightTime + 1) + minFlightTime);
    let departureTime = `${dTimeNum}:00`

    // Randomly generate arrival time
    let aTimeNum = Math.ceil(dTimeNum + hours) % 24;
    let arrivalTime = `${aTimeNum}:00`;

    // Randomly generate the price
    let price = estFlightPrice(distance, numStops, dTimeNum);

    // Return the flight object
    return {
        from: fromAirport,
        to: toAirport,
        stops: stops,
        price: price,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        hours: hours
    };
}

/**
 * @brief Function generate and return a fake middle stop for a flight
 */
function getFakeMidAiport() {

    // Number of letters in airport code
    const codeLen = 3;

    // Generate a fake airport
    let fakeAirport = '';
    for (let i = 0; i < codeLen; ++i) {

        // generate a random number between 65 and 90 (ASCII codes for capital letters)
        const randomNumber = Math.floor(Math.random() * 26) + 65;

        // convert the random number to its corresponding character
        const randomLetter = String.fromCharCode(randomNumber);

        // append the random letter to the random string
        fakeAirport += randomLetter;
    }

    return fakeAirport;
}

/**
 * @brief Function eastimates the flight price based on the distance between the origin and destination
 * @param {*} distance - The distance between the origin and destination
 * @param {*} numStops - The number of stops
 * @param {*} departureTimeNum - The departure time in 24 hours scale
 */
function estFlightPrice(distance, numStops, departureTimeNum) {

    // Original price
    let price = distance * costPerKm;

    // Introduce some randomness
    price = price * (1 + Math.random() * 0.1);

    // Reduce price due to more stops
    price = price * (1 - numStops * stopDiscountRate);

    // Cost reduction due to not preferrable departure time
    if (departureTimeNum < 8 || departureTimeNum > 20) {

        // Reduction, maximum 10% of reduction
        const reduction = Math.min(50, 0.1 * price);

        // Update the price
        price = price - reduction;
    }

    // Cast the price to integer
    price = Math.ceil(price);

    // Return the price
    return price;
}

/**
 * @brief Helper function to generate a hotel for a destination, like LAX
 * @param {*} airport - The name of the airport where we want to generate a hotel
 */
function getOneHotel(airport) {

    // Length of global variable arraies
    const firstNameNum = hotelFirstNames.length;
    const lastNameNum = hotelLastNames.length;
    const addressNum = streetAddresses.length;
    const amenitiesPoolNum = amenitiesPool.length;

    // Randomly generate the hotel name
    const firstIdx = Math.floor(Math.random() * firstNameNum);
    const lastIdx = Math.floor(Math.random() * lastNameNum);
    let hotelName = hotelFirstNames[firstIdx] + " " + hotelLastNames[lastIdx];

    // Randomly generate the address
    const addressIdx = Math.floor(Math.random() * addressNum);
    let address = streetAddresses[addressIdx];
    let hotelAddress = `${address}, ${airportsAddress[airport].city}, ${airportsAddress[airport].country}`;

    // Randomly generate stars
    let stars = Math.floor(Math.random() * (maxStars - minStars + 1) + minStars);

    // Randomly generate rating
    let rating = parseFloat((Math.random() * (maxRating - minRating) + minRating).toFixed(1));

    // Randomly generate amenities
    let cutOffIdx = Math.min(amenitiesPoolNum, randomZeroOrOne() + stars);
    let amenities = amenitiesPool.slice(0, cutOffIdx);

    // Randomly generate price
    let minPrice = priceRanges[stars].min;
    let maxPrice = priceRanges[stars].max;
    let price = Math.floor(Math.random() * (maxPrice - minPrice + 1) + minPrice);

    // Return the hotel object
    return {
        name: hotelName,
        address: hotelAddress,
        stars: stars,
        rating: rating,
        amenities: amenities,
        price_per_night: price,
    };
}

/**
 * Function randomly generates 0 or 1
 * @returns 
 */
function randomZeroOrOne() {
    return Math.floor(Math.random() * 2);
}

/**
 * Utility function writes a JSON object to a file in local directory
 * @param {*} data - data in JSON object format for writing into file 
 * @param {*} fileName - the name of the file for storing the data
 */
function writeToJson(data, fileName) {

    // Convert the JavaScript object to a JSON string
    const jsonStr = JSON.stringify(data, null, 2);

    // Write the JSON string to a file
    fs.writeFile(fileName, jsonStr, (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log('File written successfully!');
        }
    });
}

export { generateFlights, generateHotels };