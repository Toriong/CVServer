const express = require('express');
const router = express.Router();
const User = require("../models/user");


// GOAL: when the user clicks on the publish btn on the front-end side, have the following occurs;

// pertaining to the user's file (in users.js):
// find the specific draft that the user wants to publish, and delete it from user.roughDrafts
// store only the id of the draft that the user wants to published into user.publishedDrafts

// in blogposts.js
// retrieve the blogpost that the user wants to publish, and push it into blogposts collection

// GOAL: In users.js, 1) store only the id of the draft that the user wants to publish into user.publishedDrafts and 2) delete the draft that the user wants to publish from user.publishedDrafts
// 1. package received from the user which contains the user id, the id of the blogPost, and the version of the selected tags
// 2. use the user id to get the specific user, use the id 



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
// CAN rename route to "/users/updateUserInfo"
// don't need to use the params
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
        // updates only the title, subtitle, introPic, and the body of the user's draft
    } else if (package.name === "updateDraft") {
        console.log("saving rough draft of user's blogPost");
        console.log(package.data);
        if (package.data.introPic || package.data.introPic === null) {
            console.log("pic update")
            User.updateOne(
                { userName: package.username, "roughDrafts.id": package.data.id },
                {
                    $set: {
                        "roughDrafts.$.title": package.data.title,
                        "roughDrafts.$.subtitle": package.data.subtitle,
                        "roughDrafts.$.body": package.data.body,
                        "roughDrafts.$.wordCount": package.data.wordCount,
                        "roughDrafts.$.introPic": package.data.introPic,
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
        } else {
            console.log("non-pic update")
            User.updateOne(
                // roughDrafts.id is using the dot notation to only access the id field of all of the elements that is stored in the array in roughDrafts
                { userName: package.username, "roughDrafts.id": package.data.id },
                {
                    $set: {
                        "roughDrafts.$.title": package.data.title,
                        "roughDrafts.$.subtitle": package.data.subtitle,
                        "roughDrafts.$.body": package.data.body,
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
        }
        // add tags to the draft that the user is trying to post
    } else if (package.name === "addTagsToDraft") {
        console.log("updating tags of draft");
        console.log(package.data)
        console.log(id)
        User.updateOne(
            { _id: id, "roughDrafts.id": package.data.draftId },
            {
                $set:
                {
                    "roughDrafts.$.tags": package.data.tags
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
            message: "Tags added."
        });
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
    } else if (package.name === "deleteDraft") {
        console.log(package.data)
        User.updateOne(
            { userName: package.username },
            {
                $pull: { roughDrafts: { id: package.data } }
            },
            (error, data) => {
                if (error) {
                    console.error("error message: ", error);
                } else {
                    console.log("data", data);
                    response.json({
                        message: "Successfully deleted draft.",
                        updatedDrafts: data
                    });
                }
            }
        );
        console.log("draft has been deleted")
    }
})


// GOAL: send to the user all of the tags of the specific draft that the user wants to publish
// get the username from the package 
// find the user's account
// get the roughDraft that the user wants to publish by using the id that was sent up to the server 
// when the roughDraft is retrieved, send back to the user all of the tags that were selected by the user

router.route("/users/:package").get((request, response) => {
    console.log("fetch received, get specific user");
    console.log(request.params)
    console.log(request.params.package);
    const package = JSON.parse(request.params.package);
    // get the specific user account info when user signs in
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
    } else if (package.name === "getRoughDrafts") {
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
    } else if (package.name === "getTags") {
        User.find({ userName: package.username }).then(user => {
            console.log("sending tags to the front-end");
            const roughDrafts = user[0].roughDrafts;
            const draft = roughDrafts.find(draft => draft.id === package.draftId);
            console.log(draft.tags)
            response.json({
                tags: draft.tags
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
