const { request } = require('express');
const express = require('express');
const { ConnectionStates } = require('mongoose');
const router = express.Router();
const User = require("../models/user");

// post = save new user into the database

// creates user's account
router.route("/users").post((request, response) => {
    console.log("request received from the frontend")
    if (request.body.name === "newUser") {
        const newUser = new User({
            firstName: request.body.data.firstName,
            lastName: request.body.data.lastName,
            userName: request.body.data.userName,
            password: request.body.data.password,
            belief: request.body.data.belief,
            sex: request.body.data.sex,
            reasonsToJoin: request.body.data.reasonsToJoin,
            email: request.body.data.email,
            phoneNum: request.body.data.phoneNum,
            isSignIn: request.body.data.isSignIn.currently,
        });

        newUser.save();
    }

    response.json({
        status: "backend successfully received your request, user added to database",
    });
})

// update the user's profile
router.route("/users/:id").post((request, response) => {
    console.log("fetch received, update user's account");

    const id = request.params.id;
    // what is exaclty is 'User', is it how the document in the collection is structured? 
    User.updateOne({ _id: id }, {
        bio: request.body.bio,
        icon: request.body.icon,
        topics: JSON.stringify(request.body.topics),
        socialMedia: JSON.stringify(request.body.socialMedia)
    },
        // what does { multi: true } mean? 
        { multi: true },
        (err, numberAffected) => {
            if (err) {
                console.error("error message: ", err);
            }
            console.log("numberAffectd", numberAffected);
        });

    response.json({
        message: "backend successfully updated user's profile"
    });
})

// get = get the user account when the user signs in or after the user creates an account
// get the specific user account info when user signs in
router.route("/users/:userInfo").get((request, response) => {
    console.log("fetch received, get specific user")
    const user = JSON.parse(request.params.userInfo);
    if (user.password) {
        User.find({ userName: user.username }).then(user_ => {
            if (user_[0].password === user.password) {
                console.log("user signed back in")
                response.json({
                    message: `Welcome back ${user.username}!`,
                    user: {
                        id: user_[0]._id,
                        icon: user_[0].icon,
                        userName: user.username
                    }
                })
            } else {
                console.error("Sign in attempt FAILED");
                response.json({
                    message: "Inavlid username or password."
                })
            }
        }).catch(() => {
            console.error("Sign in attempt FAILED");
            response.json({
                message: "Inavlid username or password."
            })
        })
    } else {
        console.log("user created a account")
        User.find({ userName: user })
            .then(user => {
                response.json(user[0]._id)
            });
    }
});





module.exports = router;
