# Dream Vacation

Provide your `origin city`, `budget`, `number of nights`, and `type of trip` - the program will give you recommendation on the best trip package that suit your choices.

1. origin city: The city where you will start your trip
2. budget: The maximum budget for this trip
3. number of nights: How many nights you will stay in destination city
4. Type of trip: You can choose from `balanced`, `affordable` or `Luxury`. We will match you to different trips based on your preference.

The program will only return the top 1st trip for you based on our algorithms

## Installation

1. Clone the project to your local machine.
2. Open VSCode (Or other text editor), and drag the folder you cloned into VSCode
3. In VSCode, open Shell
4. Run command `npm install` to install all dependencies for the project
5. Run command `npm start`
6. You will see console output `Server running on port 80`
7. I will explain below about different endpoints

## Base URLs
`http://localhost:80`

## Endpoints

`/`: 
In the based URL, the program provides a form which allows the users to submit values for  `origin city`, `budget`, `number of nights`, and `type of trip`. After user clicks on the submit button, the program will find the best trip which meets your needs.

`/api/search?origin=${origin}&nights=${nights}&budget=${budget}&type=${type}`:
This is an API of our backend services. In the endpoint, you will provide `origin city`, `budget`, `number of nights`, and `type of trip`. The program will find the best trip according to your needs. Then, it will return a JSON file contains all the information about that trip

`/search?origin=${origin}&nights=${nights}&budget=${budget}&type=${type}`:
This is an end point for jumping from `/` endpoint to the EJS result page to show the best trip result to the client. Within the endpoint, the program send a HTTP request to the `/api/search` endpoint above to request for JSON data. Then, it renders it in the `result.ejs`

`renew/flights`: Calling this endpoint will renew the data in JSON file `public/data/flights.json`, which is treated as a database for holding randomly generated flights data

`renew/hotels`: Calling this endpoint will renew the data in JSON file `public/data/hotels.json`, which is treated as a database for holding randomly generated hotels data

## Project Structure

`app.js`: It contains implementation of `/` and `/search` endpoints. It also wire the endpoints passed from two routers. These two routers work for recommendation and random data renewing. We will go over them later.

`views/index.ejs`: It renders the form that you will see at `/` endpoint

`views/notFound.ejs`: It renders the HTML page that you will see when no trip is found

`views/result.ejs`: It renders the HTML page that you will see for listing the best trip result

`public/data`: It contains all the data in JSON format. It includes randomly generated flights and hotels data, a log file for debugging. It also contains a weight file, which has weight score for different features for calcuating weighted recommendation score.

`public/js/tools/index.js`: It has router for providing endpoints `renew/flights` and `renew/hotels`

`public/js/tools/generators.js`: It has function and logics for randomly generating flights and hotels

`public/js/recommendation/index.js`: It has router for providing endpoint `api/search`

`public/js/recommendation/queries.js`: It has functions for querying from flights and hotels "database" (We pretend their JSON file as external database, which comes with a cost when calling). The function will require the users to provide origin and destination cities for finding flights, and providing destination city for finding hotel.

`public/js/recommendation/engine.js`: It contains the core logics and functions to provide the user the best trip combination during a search.

## Recommendation Logic

1. The internal Best score (will be called b-score later for convenience) will be at a scale of 10. The number will be like 9.5, 5.6, etc...
2. The b-score of a trip a combination of `departure_flight_score`, `arriving_flight_score`, and `hotel_score` of that trip.
3. The `departure_flight_score` and `arriving_flight_score` are calculated using a same logic. In that logic, features of a flight like `price`, `flight duration`, `number of stops`, `departure time` and `arrival time` are taken into consideration. A score has been assigned to each one of these features. Before combining the features' scores into a score for the flight, a weight for the features are applied. he weight can be found at `public/data/score-weights.json`. Please refers to the code for more details.
4. Similarly, the `hotel_score` is calcualted by refering to features like `stars`, `rating`, `price`, and `number of amenities`. Weighted scores from `public/data/score-weights.json` are also applied for calculating `hotel_score`.
5. Eventually, for the trips which meet the client's budgets, the program will sort them by their b-score. The top trip will be return to the client
6. Please note that, when the user choose different type of trip (`Balanced`, `Luxury`, `Affordable`), the weight score for features distinctly are different.

## Optimization Logic
1. Since calling getFlights() and getHotels() function are costly. I decided to employ cache for saving flights and hotels.
2. When a user search for an origin city, the program will get all flights between this origin and other cities. Then the program will calculate Best score (`Balanced`, `Luxury`, `Affordable`) for all flights, and put them into a cache. In the cache, string like "JFK->LAX" will be treated as key. A timestamp will be added along too. If the timestamp expires (Currently, I defined it to expire every 24 hours), the next time the flight "JFK->LAX" is queried, the program will call getFlights() again. Before expiration, all the other call to get flights will use data from the cache.
3. I applied a similar logic to cache the hotel data. However, the expiration data for hotel data is longer. It's currently defined as 30 days.

## Potential Future Improvement
1. The weight of features and recommendation logic can be further tuned. It will improve user's satisfaction about the recommended trips. 
2. The speed of the finding trips algorithms can be further improved. It will allow searching for best trip in a larger pool of destination cities and hotels. 
