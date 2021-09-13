const express = require('express');
const router = express.Router();
const User = require("../models/user");

// NOTES:
// how do you create a loading screen?
// create a state that if true, will execute the loading animation. When false, will cease the execution of the loading animation

// GOAL: when the user clicks on the publish btn on the front-end side, have the following occurs;

// pertaining to the user's file (in users.js):
// find the specific draft that the user wants to publish, and delete it from user.roughDrafts
// store only the id of the draft that the user wants to published into user.publishedDrafts

// in blogposts.js
// retrieve the blogpost that the user wants to publish, and push it into blogposts collection

// GOAL: In users.js, 1) store only the id of the draft that the user wants to publish into user.publishedDrafts and 2) delete the draft that the user wants to publish from user.publishedDrafts
// 1. package received from the user which contains the user id, the id of the blogPost, and the version of the selected tags
// 2. use the user id to get the specific user, use the id of the draft to get the draft
// 3. compare all of the data between each other to see if they match. Check for the following:
// title
// subtitle
// introPic
// body
// tags
// 4. if all data matches, then in the users.js file on the server side, delete the draft from user.roughDrafts and store the id of the draft into user.publishDrafts
// if at least one set of the data doesn't match, then send a error message to the front end explaining that an 'Error has occur. The desired draft that you want to publish may have gone through further changes before you pressed the publish button.'
// 5. back on the front-end side, if the backend tells the front-end that the check is successful, then send the draft to the blogPosts to be displayed onto the feed page



// creates user's account
router.route("/users").post((request, response) => {
    console.log("TESTINGGGGGG")
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
        // WHAT IS HAPPENING HERE?
        newUser.save();
    };



})

// update the user's profile
// CAN rename route to "/users/updateUserInfo"
// don't need to use the params
router.route("/users/updateInfo").post((request, response) => {
    const id = request.params.id;
    console.log(id);
    const package = request.body;
    if (package.name === "add bio, icon, topics, and social media") {
        console.log("updating user's account")
        User.updateOne(
            {
                userName: package.username
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
        //     // updates only the title, subtitle, introPic, and the body of the user's draft
    } else if (package.name === "updateDraft") {
        //     console.log("saving rough draft of user's blogPost");
        //     console.log(package.data.title);
        if (package.data.introPic || package.data.introPic === null) {
            console.log({
                // title: package.data.title,
                // subtitle: package.data.subtitle,
                introPic: package.data.introPic,
                // body: package.data.body,
                // wordCount: package.data.wordCount,
                // timeOfLastEdit: package.data.timeOfLastEdit
            })
            console.log("pic update")
            response.json(
                "backend successfully updated user's profile"
            );
            //         User.updateOne(
            //             {
            //                 userName: package.username,
            //                 "roughDrafts.id": package.data.id
            //             },
            //             {
            //                 $set: {
            //                     "roughDrafts.$.title": package.data.title,
            //                     "roughDrafts.$.subtitle": package.data.subtitle,
            //                     "roughDrafts.$.body": package.data.body,
            //                     "roughDrafts.$.wordCount": package.data.wordCount,
            //                     "roughDrafts.$.introPic": package.data.introPic,
            //                     "roughDrafts.$.timeOfLastEdit": package.data.timeOfLastEdit,
            //                 }
            //             },
            //             (error, data) => {
            //                 if (error) {
            //                     console.error("error message: ", error);
            //                 } else {
            //                     console.log("data", data);
            //                     response.json(
            //                         "post request successful, draft updated"
            //                     );
            //                 }
            //             }
            //         )
        } else {
            console.log("non-pic update")
            // console.log({
            //     title: package.data.title,
            //     subtitle: package.data.subtitle,
            //     body: package.data.body,
            //     wordCount: package.data.wordCount,
            //     timeOfLastEdit: package.data.timeOfLastEdit
            // })
            response.json(
                "backend successfully updated user's profile"
            );
            // User.updateOne(
            //     // roughDrafts.id is using the dot notation to only access the id field of all of the elements that is stored in the array in roughDrafts
            //     {
            //         userName: package.username,
            //         "roughDrafts.id": package.data.id
            //     },
            //     {
            //         $set: {
            //             "roughDrafts.$.title": package.data.title,
            //             "roughDrafts.$.subtitle": package.data.subtitle,
            //             "roughDrafts.$.body": package.data.body,
            //             "roughDrafts.$.wordCount": package.data.wordCount,
            //             "roughDrafts.$.timeOfLastEdit": package.data.timeOfLastEdit,
            //         }
            //     },
            //     (error, data) => {
            //         if (error) {
            //             console.error("error message: ", error);
            //         } else {
            //             response.json(
            //                 "post request successful, draft updated"
            //             );
            //         }
            //     }
            // )
        }
        // add tags to the draft that the user is trying to post
    } else if (package.name === "addTagsToDraft") {
        console.log("updating tags of draft");
        console.log(package);
        const id = request.params.id;
        console.log(package.data)
        User.updateOne(
            {
                _id: id,
                "roughDrafts.id": package.data.draftId
            },
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
                    console.log("data", data)
                    response.json(
                        "post request successful, tags updated"
                    );
                }
            }
        );
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
    } else if (package.name === "draftCheck") {
        console.log("check if draft is ok to be published")
        // check if the package.data matches with everything that is stored in the database
        // get the user's account
        // get the specific draft from the user account
        // check if the all of the data matches
        // if all of the data matches, then do another query to store the id of the draft into publish draft and delete the draft from the user.roughDrafts
        // if at least one field of the data doesn't match, then stop the execution of the function send the error message that is written at the top of this file

        // in one query, can I find and get the specific user's rough draft that the user wants to publish?
        // in one query, get the profile of the user, get the draft that the user wants to publish  

        User.find({
            userName: package.username
        }).then(user => {
            const frontEndDraft = package.data;
            const drafts = user[0].roughDrafts;
            const draftInDB = drafts.find(_draft => _draft.id === frontEndDraft._id);
            const isTitleSame = draftInDB.title === frontEndDraft._title;
            const isSubTitleSame = frontEndDraft._subtitle ? frontEndDraft._subtitle === draftInDB.subtitle : undefined;
            const isIntroPicSame = frontEndDraft._introPic ? ((frontEndDraft._introPic.src === draftInDB.introPic.src) && (frontEndDraft._introPic.name === draftInDB.introPic.name)) : undefined;
            const isBodySame = frontEndDraft._body === draftInDB.body;
            const areTagsSame = JSON.stringify(frontEndDraft._tags) === JSON.stringify(draftInDB.tags);
            // optional: subtitle and the intro pic
            // check if the user inserted subtitle and or if the user inserted an intro pic 
            console.log({
                isTitleSame,
                isSubTitleSame,
                isIntroPicSame,
                isBodySame,
                areTagsSame
            });

            if (
                (isTitleSame && isSubTitleSame && isIntroPicSame && isBodySame && areTagsSame) ||
                (isTitleSame && (isSubTitleSame === undefined) && isIntroPicSame && isBodySame && areTagsSame) ||
                (isTitleSame && isSubTitleSame && (isIntroPicSame === undefined) && isBodySame && areTagsSame) ||
                (isTitleSame && (isSubTitleSame === undefined) && (isIntroPicSame === undefined) && isBodySame && areTagsSame)
            ) {
                console.log("moving user draft to published field");
                // User.updateOne(
                //     { userName: package.username },
                //     {
                //         $push: {
                //             publishedDrafts: frontEndDraft._id
                //         },
                //         $pull: {
                //             roughDrafts: { id: frontEndDraft._id }
                //         }
                //     },
                //     (error, data) => {
                //         if (error) throw error;
                //         else {
                //             response.json({
                //                 message: "success"
                //             });
                //         }
                //     }
                // );
            } else {
                // if the any of the criteria returns to be false, then tell the user that an error has occurred
                console.log("data that was received doesn't match with the data stored in DB.")
                response.json({
                    message: "ERROR"
                })
            }
        })
    }
})

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
