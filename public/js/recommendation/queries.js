/**
 * Author: Xinpeng Liu 
 * Email: xinpengl@andrew.cmu.edu
 * Code Last Modified: April 28, 2023
 * 
 * Script contains functions to query from "database", which is JSON files.
 * The functions will return flights between two airports and hotels in a city.
 */

// Necessary dependencies
import fs from 'fs';

// The directory that contains flights data
const flightsFile = 'public/data/flights.json';
const hotelsFile = 'public/data/hotels.json';

/**
 * Function acts as a fake database query function that returns the flights data
 * @param {*} origin - The origin airport code of the flight
 * @param {*} destination - The destination airport code of the flight
 * @returns The corresponding flights data in JSON object format
 */
function getFlights(origin, destination) {

    // Read the JSON file
    const raw = fs.readFileSync(flightsFile);
    const data = JSON.parse(raw);

    // Find the flights records that match the origin and destination
    const result = data.filter(record => record.from === origin && record.to === destination);
    return result;
}

/**
 * Function acts as a fake database query function that returns the hotels data
 * @param {*} destination - The destination city of the hotel
 * @returns The corresponding hotels data in JSON object format
 */
function getHotels(destination) {

    // Read the JSON file
    const raw = fs.readFileSync(hotelsFile);
    const data = JSON.parse(raw);

    // Find the flights records that match the origin and destination
    const result = data.filter(record => {
        return (record.address.split(",")[1].trim() === destination);
    });
    return result;
}

// Export the functions
export { getFlights, getHotels };