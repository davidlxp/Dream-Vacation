/**
 * Author: Xinpeng Liu 
 * Email: xinpengl@andrew.cmu.edu
 * Code Last Modified: April 26, 2023
 * 
 * Script contains the core function for the travel recommendation engine.
 */

// Necessary dependencies

// Import contents from other scripts
import { getFlights, getHotels } from './queries.js';

/* The cache for flights and hotels data. 
 * [Note]
 * I only used a simple HashMap as cache for now to demonstrate an idea.
 * However, in reality, we can combination of HashMap and LinkedList to create a LRU cache.
 * It will ensure the space of cache won't be exceeded. */
let flightsCache = new Map();
let hotelsCache = new Map();

// Renew the flights cache every 24 hours (in milliseconds)
let flightCacheRenewGap = 24 * 60 * 60 * 1000;

// Renew the hotels cache every 30 days (in milliseconds)
let hotelCacheRenewGap = 30 * 24 * 60 * 60 * 1000;

// City to airport code mapping
const cityToAirport = {
    'New York City': 'JFK',
    'Los Angeles': 'LAX',
    'London': 'LHR',
    'Tokyo': 'NRT',
    'Sydney': 'SYD',
};

/**
 * @brief The core function of the travel recommendation engine.
 * @param {*} originCity - The origin city of the trip
 * @param {*} numOfNights - The number of nights of the trip
 * @param {*} budget - The budget of the trip
 */
function recommendTrip(originCity, numOfNights, budget) {

    // Get the origin airport code
    const originAirport = cityToAirport[originCity];

    // Loop through all the destination airport code
    for (const destCity of Object.keys(cityToAirport)) {

        // Skip the same city
        if (destCity === originCity) {
            continue;
        }

        // Get the flights data (From DB or cache)
        const flightsData = getFlightsData(originAirport, cityToAirport[destCity]);

        // Get the hotels data (From DB or cache)
        const hotelsData = getHotelsData(destCity);

    }


}

/**
 * Function gets the flights data from the cache or database
 * @param {*} originAirport - The origin airport code of the trip
 * @param {*} destAirport - The destination airport code of the trip
 */
function getFlightsData(originAirport, destAirport) {

    // Combine the origin and destination airport code
    const key = originAirport + " -> " + destAirport;

    // Query from database if the cache doesn't contain the key, or the cache expired
    if (!flightsCache.has(key) || Date.now() - flightsCache.get(key).cacheTime > flightCacheRenewGap) {

        // Get the flights data from the database
        const flightsData = getFlights(originAirport, destAirport);

        // Get current time to cache
        const time = Date.now();

        // Combine into a data object
        data = { cacheTime: time, flights: flightsData };

        // Put into the cache or renew the cache
        flightsCache.set(key, data);
    }

    // Always return the flights data from cache
    return flightsCache.get(key);
}

/**
 * @brief Function gets the hotels data from the cache or database
 * @param {*} destCity - The destination city of the trip
 */
function getHotelsData(destCity) {

    // Query from database if the cache doesn't contain the key, or the cache expired
    if (!hotelsCache.has(destCity) || Date.now() - hotelsCache.get(destCity).cacheTime > hotelCacheRenewGap) {

        // Get the hotels data from the database
        const hotelsData = getHotels(destCity);

        // Get current time to cache
        const time = Date.now();

        // Combine into a data object
        data = { cacheTime: time, hotels: hotelsData };

        // Put into the cache or renew the cache
        hotelsCache.set(destCity, data);
    }

    // Always return the hotels data from cache
    return hotelsCache.get(destCity);
}

/**
 * @brief Function provides internal rating score for a flight
 * @param {*} flight - A flight object
 */
function scoreFlight(flight) {

}

/**
 * @brief Function provides internal rating score for a hotel
 * @param {*} flight - A hotel object
 */
function scoreHotel(hotel) {

}




