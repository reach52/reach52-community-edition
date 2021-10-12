# README

## reach52 Community edition

reach52 Community edition is an open-source Node.js codebase aiming to support payments, mWallets, and other Healthcare e-commerce functionalities with an aim to grow and let others grow by laying a strong foundation.

### What is this repository for?

-   Creating a plug-n-play solution for the existing/upcoming Healthcare e-commerce platforms
-   Current version of this repository is version 0.0.1 (v0.0.1)

## Motivation

reach52 is at the forefront of the HealthCare e-commerce domain in catering to the under-privileged health and to get them the much-needed healthcare facilities. HealthCare is not a luxure, it is the right of every human and thus we are helping them get wht they rightly deseeve.

## Build status

Build status of continus integration - reach52 Community edition

[Build Status: TBD](CI/CD Link: TBD)

## Tech/framework used

Node.js is a cross-platform runtime library and environment for running JavaScript applications outside the browser. This is a free and open source tool used for creating server-side JS applications.
Node.js applications are written in JavaScript. This application runs within the Node.js runtime on Linux and Microsoft Windows. This framework offers a rich library of various JavaScript modules to simplify web development processes.

More details can be found on [Node.js](https://nodejs.dev/)

For beginners on Node.js, check out [How do I start with Node.js after I installed it?](https://nodejs.org/en/docs/guides/getting-started-guide/)

## Contributing Guidelines

Please refer to the [CONTRIBUTING.MD](https://bitbucket.org/reach52/reach52-community-edition/src/master/CONTRIBUTING.md) file for more details on the coding standard and other measures to take.

## Features

-   mWallets
-   Payment gateway
    -   Transfer to another repository: https://bitbucket.org/reach52/payment-gateway/src
-   Supplier Onboarding
-   Discounts/Points logics

## Installation/Deployment

# This is an API open source project built in Node.js and hence this project needs to be deployed on to a server.

This is an API open source project built in Node.js and hence this project needs to be deployed to a server.

You can take a look at the API documentation here: [API Documentation](https://api-open.reach52.com/api-docs/)

There are many ways of hosting the API but for the sake of simplicity, let's take the case of hosting this in AWS from where your endpoints are to be exposed. To do this, please follow the steps mentioned [here](https://aws.amazon.com/getting-started/hands-on/build-serverless-web-app-lambda-apigateway-s3-dynamodb-cognito/module-4/).

**_Once the hosting is done, you can test the end-points using any REST client like Postman_**

## Tests

Stpes on how to run the tests will be added once the tests are ready in the repo.
1.Run command npm test
2.it will test all apis & throw errors from apis as respected to api functionality

=======
Steps on how to run the tests will be added once the tests are ready in the repo.
1.Run command npm test
2.It will test all APIs & throw errors in relation to the APIs' functionality.

## How to use?

Steps will be added here
1.Set up database url in .env file
2.run npm start , it will show connected port & database connection status & database name
3.We need ResidentUser & OrderMedicine collection in Mongo DB as per schema
=======
1.Set up the database url in .env file
2.Run npm start. It will show the connected port & database connection status & database name
3.We will need the ResidentUser & OrderMedicine collections in Mongo DB as per the schema.

### Who do I talk to?

-   # Repo owner or admin - [Lakshmi Narasimhan](lakshmi@reach52.com)

*   Repo owner or admin - [Anil Kumar](anil@reach52.com)

### Who is reach52?

To know us and our social impact cause better, visit us at [reach52](https://reach52.com/)

## License

MIT License.

Copyright (c) 2021 reach52 Community edition.
