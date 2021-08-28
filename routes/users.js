const express = require('express');
const router = express.Router();
const User = require("../models/user");

// post = save new user into the database

// creates user's account
router.route("/users").post((request, response) => {
    console.log("request received from the frontend")
    if (request.body.packageName === "newUser") {
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
            isSignIn: request.body,
        });
        console.log(newUser);
        response.json({
            status: "backend successfully received your request, user added to database",
        });
        newUser.save();
    };



})

// update the user's profile
router.route("/users/:id").post((request, response) => {
    console.log("fetch received, update user's account");
    const id = request.params.id;
    console.log(request.body)
    // what is exactly is 'User', is it how the document in the collection is structured? 
    if (request.body.name === "add bio, icon, topics, and social media") {
        console.log("updating user's account")
        User.updateOne({ _id: id }, {
            bio: request.body.data_.bio,
            icon: request.body.data_.icon,
            topics: JSON.stringify(request.body.data_.topics),
            socialMedia: JSON.stringify(request.body.data_.socialMedia)
        },
            // what does { multi: true } mean? 
            { multi: true },
            (err, numberAffected) => {
                if (err) {
                    console.error("error message: ", err);
                }
                console.log("numbers affected", numberAffected);
            });

        response.json({
            message: "backend successfully updated user's profile"
        });
    } else if (request.body.name === "blog post rough drafts") {
        console.log("saving rough draft of user's blogPost");
        User.updateOne({ _id: id }, {
            // get the draft that the user's is currently making by way of its id
            roughDrafts: request.body.data
        },
            // what does { multi: true } mean? 
            { multi: true },
            (err, numberAffected) => {
                if (err) {
                    console.error("error message: ", err);
                }
                // what is 'numberAffected' mean? 
                console.log("numbers affected", numberAffected);
            });
        response.json({
            message: "user's draft saved into database"
        });
    }
})

// get = get the user account when the user signs in or after the user creates an account
// get the specific user account info when user signs in
router.route("/users/:userInfo").get((request, response) => {
    console.log("fetch received, get specific user");
    console.log(request.body);
    console.log(request.params.userInfo);
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
                        userName: user.username,
                        roughDrafts: user_[0].roughDrafts,
                        firstName: user_[0].firstName,
                        lastName: user_[0].lastName
                    }
                })
            } else {
                console.error("Sign in attempt FAILED");
                response.json({
                    message: "Invalid username or password."
                })
            }
        }).catch(() => {
            console.error("Sign in attempt FAILED");
            response.json({
                message: "Invalid username or password."
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

router.route("/users").get((req, res) => {
    console.log("getting all users");
    User.find()
        .then(user => res.json(user))
})





module.exports = router;
