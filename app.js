/**
 * Author: Xinpeng Liu 
 * Email: xinpengl@andrew.cmu.edu
 * Code Last Modified: April 26, 2023
 * 
 * A travel search web server that allows users to search for the best round-trip 
 * flights+hotel combinations based on their origin, number of nights, and budget.
 */

// Import necessary dependencies
import express from 'express'
import bodyParser from 'body-parser'

// Import contents from other scripts
import renewRouter from './public/js/tools/index.js'
import recommendRouter from './public/js/recommendation/index.js'

// Create the app
const app = express();

// For ejs
app.set('view engine', 'ejs');
app.use(express.static(new URL('public', import.meta.url).pathname));

// Configure middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect the app with the other specific route handler
app.use(renewRouter);
app.use(recommendRouter);

// Define routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Home Page' });
});

// Start the server
const port = 80;
app.listen(port, () => {
    console.log(`Server running on port ${port}\n\n`
        + `If you are on local machine, visit:\nhttp://localhost:${port}/`);
});