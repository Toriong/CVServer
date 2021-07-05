require('dotenv').config();

const { urlencoded } = require('express');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const dbconnection = "mongodb+srv://gtorio:simba1997@clustercv.blvqa.mongodb.net/CVBlog"

mongoose.connect(dbconnection, {
    useUnifiedTopology: true,
    useNewUrlParser: true
}).then(() => {
    console.log("connection to mongodb database is successful!")
});

const userSchema = {
    id: String,
    firstName: String,
    lastName: String,
    userName: String,
    password: String,
    belief: String,
    sex: String,
    reasonsToJoin: String,
    email: String,
    phoneNum: String
}

const User = mongoose.model("users", userSchema)


app.use(express.json());

app.get("/users", (request, response) => {
    response.json("wazzzz up")
})



// get the new user account info
app.post("/users", (request, response) => {
    console.log("request received from the frontend")
    const newUser = new User({
        firstName: request.body.user.firstName,
        lastName: request.body.user.lastName,
        userName: request.body.user.userName,
        password: request.body.user.password,
        belief: request.body.user.belief,
        sex: request.body.user.sex,
        reasonsToJoin: request.body.user.reasonsToJoin,
        email: request.body.user.email,
        phoneNum: request.body.user.phoneNum
    });

    response.json({
        status: "backend successfully received your request",
        receivedData: request.body.user
    });

    newUser.save();
})

app.listen(3005, () => {
    console.log('server started on 3005')
})
