

// Import necessary dependencies
import express from 'express'                   // The core express package 
import { wrap } from 'async-middleware'         // Need the wrap async middleware to use "app.use()" in app.js

// Import contents from other scripts
import { generateFlights, generateHotels } from './generators.js';

// Creating a router, which will be passed back to app.js
const router = express.Router();

/* Route for renewing hotel JSON file.
 * It will return the JSON file of renewed content back to the client too */
router.get(
    '/renew/hotels',
    wrap(generateHotels)
);

/* Route for renewing flight JSON file. 
 * It will return the JSON file of renewed content back to the client too */
router.get(
    '/renew/flights',
    wrap(generateFlights)
);

// export the books router
export default router