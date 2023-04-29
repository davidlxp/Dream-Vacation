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
