/**
 * Author: Xinpeng Liu 
 * Email: xinpengl@andrew.cmu.edu
 * Code Last Modified: April 26, 2023
 * 
 * A module which contains the core function, which is the engine of the travel search web server.
 */

// Import necessary dependencies
import express from 'express'                   // The core express package 
import { wrap } from 'async-middleware'         // Need the wrap async middleware to use "app.use()" in app.js

// Import contents from other scripts
import { getTrip } from './engine.js';

// Creating a router, which will be passed back to app.js
const router = express.Router();

/* Route for renewing hotel JSON file.
 * It will return the JSON file of renewed content back to the client too
 * For example: /origin/New York City/nights/3/budget/6000/type/balanced */
router.get(
    '/origin/:origin/nights/:nights/budget/:budget/type/:type',
    wrap(getTrip)
);

// export the books router
export default router