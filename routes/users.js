const { request } = require('express');
const express = require('express');
const router = express.Router();
const User = require("../models/user");

// post = save new user into the database
router.route("/users").post((request, response) => {
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


// get = get the user account when the user signs in
router.route("/users").get((request, response) => {
    User.find()
        .then(user => response.json(user))
})






module.exports = router;
