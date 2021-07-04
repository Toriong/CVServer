require('dotenv').config();

const { urlencoded } = require('express');
const express = require('express');
const bodyParser = require('body-parser')
const app = express();

app.use(bodyParser.json())
app.use(express.json());

app.get("/accounts", (request, response) => {
    response.json("hello from backend, wazzzz up")
})

app.post("/accounts", (request, response) => {
    console.log("data: ", request.body.newAccount);
    response.json({
        status: "backend successfully received your request",
        receivedData: request.body.newAccount
    });
})

app.listen(3005, () => {
    console.log('server started')
})
