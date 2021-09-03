const express = require('express');
const router = express.Router();
const User = require("../models/user");
const { MongoClient } = require("mongodb");
const getDate = require('../functions/getDate')




// NOTES:
// what if the user's has no rough drafts field? Does push just creates one for me?

// QUESTIONS:
// when I find the user.roughDrafts, how do I find the specific id in user.RoughDrafts from the server side

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
    const id = request.params.id;
    const package = request.body;
    if (package.name === "add bio, icon, topics, and social media") {
        console.log("updating user's account")
        User.updateOne(
            {
                _id: id
            },
            {
                // EDIT
                bio: request.body.data_.bio,
                icon: request.body.data_.icon,
                topics: JSON.stringify(request.body.data_.topics),
                socialMedia: JSON.stringify(request.body.data_.socialMedia)
            },
            { multi: true },
            (error, data) => {
                if (error) {
                    console.error("error message: ", error);
                } else {
                    console.log("data", data);
                }
            }
        );

        response.json({
            message: "backend successfully updated user's profile"
        });
    } else if (package.name === "updateDraft") {
        console.log("saving rough draft of user's blogPost");
        // find the user in the user collections
        User.updateOne(
            { userName: package.username, "roughDrafts.id": package.data.id },
            {
                $set: {
                    "roughDrafts.$.title": package.data.title,
                    "roughDrafts.$.subtitle": package.data.subtitle,
                    "roughDrafts.$.body": package.data.body,
                    "roughDrafts.$.tags": package.data.tags,
                    "roughDrafts.$.wordCount": package.data.wordCount,
                    "roughDrafts.$.timeOfLastEdit": package.data.timeOfLastEdit,
                }
            },
            (error, data) => {
                if (error) {
                    console.error("error message: ", error);
                } else {
                    console.log("data", data);
                }
            }
        )
        response.json({
            message: "user's draft saved into database"
        });

        // add a new rough draft to user's roughDrafts when the user clicks on the 'Write Post' button
    } else if (package.name === "addNewDraft") {
        console.log("user wants to write a new rough draft.");
        console.log(package);
        User.updateOne(
            { userName: package.username },
            { $push: { roughDrafts: package.data } },
            { multi: true },
            (err, data) => {
                if (err) {
                    console.error("error message: ", err);
                } else {
                    console.log("data", data);
                }
            });
        response.json({
            message: "post request successful, new rough draft added"
        });
    }
})

// get = get the user account when the user signs in or after the user creates an account
// get the specific user account info when user signs in
router.route("/users/:package").get((request, response) => {
    console.log("fetch received, get specific user");
    console.log(request.params.package);
    const package = JSON.parse(request.params.package);
    if (package.password) {
        User.find({ userName: package.username }).then(user_ => {
            if (user_[0].password === package.password) {
                console.log("user signed back in")
                console.log(JSON.stringify(user_[0]));
                response.json({
                    message: `Welcome back ${user_[0].userName}!`,
                    user: {
                        id: user_[0]._id,
                        icon: user_[0].icon,
                        userName: user_[0].userName,
                        firstName: user_[0].firstName,
                        lastName: user_[0].lastName,
                    }
                })
            } else {
                console.error("Sign-in attempt FAILED");
                response.json({
                    message: "Invalid username or password."
                })
            }
        }).catch(() => {
            console.error("Sign-in attempt FAILED");
            response.json({
                message: "Invalid username or password."
            })
        })
    }
    // else {
    //     // why do I have this code here?
    //     console.log("user created a account")
    //     User.find({ userName: user })
    //         .then(user => {
    //             response.json(user[0]._id)
    //         });
    // }

    if (package.name === "getRoughDrafts") {
        User.find({ userName: package.username }).then(user_ => {
            console.log("getting user's rough drafts")
            response.json({
                roughDrafts: user_[0].roughDrafts
            })
        }).catch(err => {
            console.error(`Something went wrong, error message: ${err}`);
            response.json({
                message: `Something went wrong, error message: ${err}`
            })
        });
    }
});

router.route("/users").get((req, res) => {
    console.log("getting all users");
    User.find()
        .then(user => res.json(user))
})





module.exports = router;
