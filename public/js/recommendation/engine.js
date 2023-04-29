/**
 * Author: Xinpeng Liu 
 * Email: xinpengl@andrew.cmu.edu
 * Code Last Modified: April 26, 2023
 * 
 * Script contains the core function for the travel recommendation engine.
 */

// Import necessary dependencies
import fs from 'fs';

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
let flightsCacheRenewGap = 24 * 60 * 60 * 1000;

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

// A config file which contains the weights of different features according to different trip types
const weightsFile = 'public/data/score-weights.json';

// Max and Min of score for a single feature
const maxScore = 10;
const minScore = 1;
const scoreDiff = maxScore - minScore;

// JSON file names for logging
const logFile = 'public/data/log.json';

// Indicates return how many records
const topN = 1;

/**
 * @berif Function that returns the recommended trip based on the user's input
 */
function getTrip(req, res, next) {

    // Get the user's input
    let origin = req.query.origin;
    let nights = req.query.nights;
    let budget = req.query.budget;
    let type = req.query.type;

    // If any of these parameters is missing, return 400
    if (!origin || !nights || !budget || !type) {

        // Return 400 if any of the parameters is missing
        res.status(400).send({ 'Message': 'Missing parameters. Needs: origin, nights, budget, type' });

        // Return to the client
        return;
    }

    // If the type is wrong, return 400
    if (type !== 'balanced' && type !== 'luxury' && type !== 'affordable') {

        // Return 400 if the type is wrong
        res.status(400).send({ 'Message': 'Wrong type. Needs: balanced, luxury, affordable' });

        // Return to the client
        return;
    }

    // Tranform the data
    nights = parseInt(nights);
    budget = parseInt(budget);

    // Prepare the parsed message
    const parsed = `You are searching for a ${type} trip from ${origin} for ${nights} nights with a budget of $${budget}.`
    console.log(parsed);

    // Get the recommended trip
    const trip = recommendTrip(origin, nights, budget, type, topN);
    const tripJSON = JSON.stringify(trip, null, 2);

    // Set the response header
    res.set('Content-Type', 'application/json');

    // Return to client
    if (trip.length === 0) {

        // Return 404 if no trip is found
        res.status(404).send({ 'Message': `No trip is found for ${type} trip from ${origin} for ${nights} nights with a budget of $${budget}.` });

    } else {

        // Write the JSON string to a log file
        fs.writeFile(logFile, tripJSON, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('File written successfully!');
            }
        });

        // Return to the client
        res.status(200).send(tripJSON);
    }
}

/**
 * @brief The core function of the travel recommendation engine.
 * @param {*} originCity - The origin city of the trip
 * @param {*} numOfNights - The number of nights of the trip
 * @param {*} budget - The budget of the trip
 * @param {*} tripType - The type of the trip (e.g. balanced, luxury, affordable)
 * @param {*} topN - The number of top trips to return
 */
function recommendTrip(originCity, numOfNights, budget, tripType, topN) {

    // Tracking the trips that are suitable for budget
    let trips = [];

    // Get the origin airport code
    const originAirport = cityToAirport[originCity];

    // Loop through all the destination airport code
    for (const destCity of Object.keys(cityToAirport)) {

        // Get the destination airport code
        const destAirport = cityToAirport[destCity];

        // Skip the same city
        if (destCity === originCity) {
            continue;
        }

        // Get the flights data for going to vacation (From DB or cache)
        const goFlightsData = getFlightsData(originAirport, destAirport);

        // Get the flights data for coming back from vacation (From DB or cache)
        const backFlightsData = getFlightsData(destAirport, originAirport);

        // Get the hotels data (From DB or cache)
        const hotelsData = getHotelsData(destCity);

        /* Loop through all the combinations. Only find the combo that fits the price range */
        for (let i = 0; i < goFlightsData.length; ++i)
            for (let j = 0; j < backFlightsData.length; ++j)
                for (let k = 0; k < hotelsData.length; ++k) {

                    // Try to add the trip combination to the trips array
                    addTirpComb(goFlightsData, backFlightsData, hotelsData, tripType,
                        budget, numOfNights, i, j, k, trips);
                }
    }

    // Sort the trips by score
    trips.sort((a, b) => { return b.score - a.score; });

    // Get the top N trips
    const topTrips = trips.slice(0, topN);
    console.log(topTrips);

    // Return the top 3 trips by score
    return topTrips;
}

/**
 * @brief Helper function which check if a trip is suitable for the budget. If so, add to the trips array. 
 */
function addTirpComb(goFlightsData, backFlightsData, hotelsData, tripType,
    budget, numOfNights, i, j, k, trips) {

    // Get the price of the trip
    const totalPrice = goFlightsData[i].price + backFlightsData[j].price + hotelsData[k].price_per_night * numOfNights;

    // Check if the trip is suitable for the budget
    if (totalPrice <= budget) {

        /* Get the score of the trip */
        let totalScore = (goFlightsData[i].score[tripType]
            + backFlightsData[j].score[tripType] + hotelsData[k].score[tripType]) / 30 * 10;
        totalScore = parseFloat(totalScore.toFixed(1))

        // Combine the trip into a trip object
        const trip = {
            budget: budget,
            nights: numOfNights,
            price: totalPrice,
            score: totalScore,
            goFlight: goFlightsData[i],
            backFlight: backFlightsData[j],
            hotel: hotelsData[k],
        };

        // Push the trip into the trips array
        trips.push(trip);
    }
}

/**
 * Function gets the flights data from the cache or database
 * @param {*} originAirport - The origin airport code of the trip
 * @param {*} destAirport - The destination airport code of the trip
 * @returns The flights data
 */
function getFlightsData(originAirport, destAirport) {

    // Combine the origin and destination airport code as key
    const key = originAirport + " -> " + destAirport;

    // Query from database if the cache doesn't contain the key, or the cache expired
    if (!flightsCache.has(key) || Date.now() - flightsCache.get(key).cacheTime > flightsCacheRenewGap) {

        // Get the flight weights of different features for all trip types
        const raw = fs.readFileSync(weightsFile);
        const weightsData = JSON.parse(raw);

        // Get the flights data from the database
        let flightsData = getFlights(originAirport, destAirport);

        // Get current time to cache
        const time = Date.now();

        // Get the benchmarks for different features from the flights data
        const benchmarks = getFlightBenchmarks(flightsData);

        // Adding score to each flight
        for (let flight of flightsData) {

            // For a flight get an object which holds the score for each trip type
            const scores = scoreFlight(flight, weightsData, benchmarks);

            // Append the scores to the flight object
            flight.score = scores;
        }

        // Combine into a data object
        const data = { cacheTime: time, flights: flightsData };

        // Put into the cache or renew the cache
        flightsCache.set(key, data);
    }

    // Always return the flights data from cache
    return flightsCache.get(key).flights;
}

/**
 * @brief Function gets feature's benchmark from an array of flights
 */
function getFlightBenchmarks(flightsData) {

    // Benchmarks for different features
    let maxPrice = flightsData[0].price;
    let minPrice = flightsData[0].price;
    let maxDuration = flightsData[0].duration;
    let minDuration = flightsData[0].duration;

    // Loop through all the flights
    for (let flight of flightsData) {
        if (flight.price > maxPrice) maxPrice = flight.price;
        if (flight.price < minPrice) minPrice = flight.price;
        if (flight.duration > maxDuration) maxDuration = flight.duration;
        if (flight.duration < minDuration) minDuration = flight.duration;
    }

    // Return the benchmarks
    const benchmarks = {
        maxPrice: maxPrice,
        minPrice: minPrice,
        maxDuration: maxDuration,
        minDuration: minDuration
    };
    return benchmarks;
}

/**
 * @brief Function gets the hotels data from the cache or database
 * @param {*} destCity - The destination city of the trip
 */
function getHotelsData(destCity) {

    // Query from database if the cache doesn't contain the key, or the cache expired
    if (!hotelsCache.has(destCity) || Date.now() - hotelsCache.get(destCity).cacheTime > hotelCacheRenewGap) {

        // Get the flight weights of different features for all trip types
        const raw = fs.readFileSync(weightsFile);
        const weightsData = JSON.parse(raw);

        // Get the hotels data from the database
        let hotelsData = getHotels(destCity);

        // Get current time to cache
        const time = Date.now();

        // Get the benchmarks for different features from the flights data
        const benchmarks = getHotelBenchmarks(hotelsData);

        // Adding score to each hotel
        for (let hotel of hotelsData) {

            // Calculate score for different trip types for this flight
            let scores = scoreHotel(hotel, weightsData, benchmarks);

            // Append the scores to the hotel object
            hotel.score = scores
        }

        // Combine into a data object
        const data = { cacheTime: time, hotels: hotelsData };

        // Put into the cache or renew the cache
        hotelsCache.set(destCity, data);
    }

    // Always return the hotels data from cache
    return hotelsCache.get(destCity).hotels;
}

/**
 * @brief Function gets feature's benchmark from an array of hotels
 */
function getHotelBenchmarks(hotelsData) {

    // Benchmarks for different features
    let maxPrice = hotelsData[0].price_per_night;
    let minPrice = hotelsData[0].price_per_night;

    // Loop through all the hotels
    for (let hotel of hotelsData) {
        if (hotel.price_per_night > maxPrice) maxPrice = hotel.price_per_night;
        if (hotel.price_per_night < minPrice) minPrice = hotel.price_per_night;
    }

    // Return the benchmarks
    const benchmarks = {
        maxPrice: maxPrice,
        minPrice: minPrice,
        maxStars: 5,
        minStars: 1,
        maxRating: 10,
        minRating: 3,
        maxAmenities: 6,
        minAmenities: 1
    };
    return benchmarks;
}

/**
 * @brief Function provides internal rating score for a flight
 * @param {*} flight - A flight object
 * @param {*} weightsData - An object which holds the weights of different features for all trip types
 * @param {*} benchmarks - The benchmarks object for each feature.
 */
function scoreFlight(flight, weightsData, benchmarks) {

    /* [Logic of Algorithms]
     * 
     * As a passenger, I prefer my flight:
     * 1. Price as low as possible. 
     * 2. Flight duration as short as possible.
     * 3. Stops as little as possible. 
     * 4. both departure and arrival time in the daytime (8 - 18)
     * 
     * For each one of these features, I assign a weight to them. The 
     * weight reflect the customer's trade-off preference over different features.
     */

    // ------------------ Get the score for individual features ------------------

    // Point for price
    let pricePt = (benchmarks.maxPrice - flight.price) / (benchmarks.maxPrice - benchmarks.minPrice)
        * (maxScore - minScore) + minScore;
    pricePt = pricePt.toFixed(2);

    // Point for duration
    const durationPt = (benchmarks.maxDuration - flight.duration) / (benchmarks.maxDuration - benchmarks.minDuration)
        * (maxScore - minScore) + minScore;

    // Point for stops
    const stopsPt = maxScore - (flight.stops.length * 2);

    // Point for departure time
    const depTime = parseInt(flight.departure_time.split(':')[0]);
    let depTimePt = scoreFlightTime(depTime);

    // Point for arrival time
    const arrTime = parseInt(flight.arrival_time.split(':')[0]);
    let arrTimePt = scoreFlightTime(arrTime);

    // ------------------ Get weights of different trip type ------------------

    const balanced_w = weightsData.balanced.flight;
    const luxury_w = weightsData.luxury.flight;
    const affordable_w = weightsData.affordable.flight;

    // ------------------ Calculate the total score for different trip type ------------------

    // Caculate balanced score
    let balanced_s = calcFlightScore_byTripType(pricePt, durationPt, stopsPt, depTimePt, arrTimePt, balanced_w);

    // Caculate luxury score
    let luxury_s = calcFlightScore_byTripType(pricePt, durationPt, stopsPt, depTimePt, arrTimePt, luxury_w);

    // Calculate affordable score
    let affordable_s = calcFlightScore_byTripType(pricePt, durationPt, stopsPt, depTimePt, arrTimePt, affordable_w);

    // Calculate score for different trip types for this flight
    let allScores = {
        balanced: balanced_s,
        luxury: luxury_s,
        affordable: affordable_s
    };

    // Return all scores
    return allScores;
}

/**
 * @brief Given the base scores of different features, and the weights of 
 * different features, calculate the final score of a trip type
 * @param {*} pricePt - The base score of price
 * @param {*} durationPt - The base score of duration
 * @param {*} stopsPt - The base score of stops
 * @param {*} depTimePt - The base score of departure time
 * @param {*} arrTimePt - The base score of arrival time
 * @param {*} weights - The weights of different features
 */
function calcFlightScore_byTripType(pricePt, durationPt, stopsPt, depTimePt, arrTimePt, weights) {

    // Caculate the score using weight
    let score = pricePt * weights.price + durationPt * weights.duration + stopsPt * weights.stops +
        depTimePt * weights.departureTime + arrTimePt * weights.arrivalTime;

    // Return the score
    return parseFloat(score.toFixed(1));
}

/**
 * @brief Function used to score the departure time and arrival time of a flight
 * @param {*} time - The time of the flight, in integer format (e.g. 8:00 -> 8, 18:00 -> 18)
 */
function scoreFlightTime(time) {

    // Point for flight time
    let timePt;

    // Logic of scoring flight time
    if (time < 7 || time > 21) {
        timePt = minScore;
    } else if (time < 9 || time > 18) {
        timePt = minScore + scoreDiff * 0.75;
    } else if (time < 11 || time > 15) {
        timePt = minScore + scoreDiff * 0.9;
    } else {
        timePt = maxScore;
    }

    // Return the point
    return timePt;
}

/**
 * @brief Function provides internal rating score for a hotel
 * @param {*} flight - A hotel object
 * @param {*} weightsData - An object which holds the weights of different features for all trip types
 * @param {*} benchmarks - The benchmarks object for each feature.
 */
function scoreHotel(hotel, weightsData, benchmarks) {

    /* [Logic of Algorithms]
     * 
     * As a passenger, I prefer my flight:
     * 1. Price as low as possible. 
     * 2. Star as high as possible
     * 3. Rating as high as possible
     * 4. Amenities as many as possible
     * 
     * For each one of these features, I assign a weight to them. The 
     * weight reflect the customer's trade-off preference over different features.
     */

    // ------------------ Get the score for individual features ------------------

    // Point for price
    const pricePt = (benchmarks.maxPrice - hotel.price_per_night) / (benchmarks.maxPrice - benchmarks.minPrice)
        * (maxScore - minScore) + minScore;

    // Point for star
    const starPt = (hotel.stars - benchmarks.minStars) / (benchmarks.maxStars - benchmarks.minStars)
        * (maxScore - minScore) + minScore;

    // Point for rating
    const ratingPt = (hotel.rating - benchmarks.minRating) / (benchmarks.maxRating - benchmarks.minRating)
        * (maxScore - minScore) + minScore;

    // Point for amenities
    const amenitiesPt = (hotel.amenities.length - benchmarks.minAmenities) / (benchmarks.maxAmenities - benchmarks.minAmenities)
        * (maxScore - minScore) + minScore;

    // ------------------ Get weights of different trip type ------------------

    const balanced_w = weightsData.balanced.hotel;
    const luxury_w = weightsData.luxury.hotel;
    const affordable_w = weightsData.affordable.hotel;

    // ------------------ Calculate the total score for different trip type ------------------

    // Caculate balanced score
    let balanced_s = calcHotelScore_byTripType(pricePt, starPt, ratingPt, amenitiesPt, balanced_w);

    // Caculate luxury score
    let luxury_s = calcHotelScore_byTripType(pricePt, starPt, ratingPt, amenitiesPt, luxury_w);

    // Calculate affordable score
    let affordable_s = calcHotelScore_byTripType(pricePt, starPt, ratingPt, amenitiesPt, affordable_w);

    // Calculate score for different trip types for this flight
    let allScores = {
        balanced: balanced_s,
        luxury: luxury_s,
        affordable: affordable_s
    };

    // Return all scores
    return allScores;
}

/**
 * @brief Given the base scores of different features, and the weights of 
 * different features, calculate the final score of a trip type
 * @param {*} pricePt - The base score of price
 * @param {*} starPt - The base score of star
 * @param {*} ratingPt - The base score of rating
 * @param {*} amenitiesPt - The base score of amenities
 * @param {*} weights - The weights of different features
 */
function calcHotelScore_byTripType(pricePt, starPt, ratingPt, amenitiesPt, weights) {

    // Calculate the total score with weights (Return a score at scale of 100)
    let score = pricePt * weights.price + starPt * weights.star + ratingPt * weights.rating +
        amenitiesPt * weights.amenities;

    // Return the score
    return parseFloat(score.toFixed(1));
}

export { getTrip, recommendTrip };
