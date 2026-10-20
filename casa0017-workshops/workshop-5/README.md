# Workshop 5 — Introduction to Node.js

This folder contains the first Node.js program from the CASA0017 Workshop 5 guide. It prints a coloured title and welcome message using the course's `colors` package.

## Run locally

From the `casa0017-workshops` directory:

```powershell
npm ci --ignore-scripts
npm run start:workshop-5
```

Expected text (the terminal adds red and green colour):

```text
*********** My First Node.JS Program ***********
Welcome to your first node program
```

Run the Workshop 5 tests with:

```powershell
npm run test:workshop-5
```

## Course-server alternative

The guide also permits running the exercise on `casa0017.cetools.org` over SSH. That is optional when Node.js is available locally. If using the server, create your own directory, transfer `first.js` and install the pinned dependency there. Enter UCL credentials only into the trusted SSH client; never save passwords in this repository.

The implementation imports `colors/safe` from `colors@1.4.0`. This produces the same coloured output as the guide without modifying JavaScript's global `String` prototype.
