const express = require('express');
const router = express.Router();
const User = require("../models/user");
const { MongoClient } = require("mongodb");




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
    } else if (request.body.name === "updateDraft") {
        console.log("saving rough draft of user's blogPost");
        // GOAL: update the specific rough draft that the user is working on by their id
        // get the rough draft the user is working on 
        // find the user by their 
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

        // add a new rough draft to user's roughDrafts when the user clicks on the 'Write Post' button
    } else if (request.body.name === "addNewDraft") {
        console.log("user wants to write a new rough draft.");
        const package = request.body;
        // REDO: within the findAndModify method, find the specific user by their username. Then spit out the result and modify the results  
        User.find().then(users => {
            const user = users.find(user_ => user_.userName === package.username);
            const newDraft = {
                ...package.data,
                createdDate: Date.now()
            }
            const roughDrafts_ = [...user.roughDrafts, newDraft];
            User.updateOne({ userName: user.userName }, {
                roughDrafts: roughDrafts_
            },
                { multi: true },
                err => {
                    if (err) {
                        console.error("error message: ", err);
                    }
                }
            )
        })
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
                        roughDrafts: user_[0].roughDrafts
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
