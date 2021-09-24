const express = require('express');
const router = express.Router();
const User = require("../models/user");


// GOAL: receive draft from front-end, delete the draft from user.roughDrafts and push id into user.publishedDrafts

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
        // WHAT IS HAPPENING HERE?
        newUser.save();
    };



})

// update the user's profile
// CAN rename route to "/users/updateUserInfo"
// don't need to use the params
// don't use username, use the id of the user 
router.route("/users/updateInfo").post((request, response) => {
    const { name, username, data } = request.body
    if (name === "add bio, icon, topics, and social media") {
        console.log("updating user's account")
        const { bio, icon, topics, socialMedia } = data
        User.updateOne(
            {
                userName: username
            },
            {
                // EDIT
                bio: bio,
                icon: icon,
                // why did I stringify these two?
                topics: JSON.stringify(topics),
                socialMedia: JSON.stringify(socialMedia)
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
    } else if (name === "updateDraft") {
        console.log("updating draft")
        const { draftId, data } = request.body;
        const { title, subtitle, introPic, timeOfLastEdit, body } = data;
        if (introPic || introPic === null) {
            User.updateOne(
                {
                    userName: username,
                    "roughDrafts.id": draftId
                },
                {
                    $set: {
                        "roughDrafts.$.title": title,
                        "roughDrafts.$.subtitle": subtitle,
                        "roughDrafts.$.body": body,
                        "roughDrafts.$.introPic": introPic,
                        "roughDrafts.$.timeOfLastEdit": timeOfLastEdit,
                    }
                },
                (error, data) => {
                    if (error) {
                        console.error("error message: ", error);
                    } else {
                        console.log("data", data);
                        response.json(
                            "Draft saved."
                        );
                    }
                }
            )
        } else {
            console.log("non-pic update");
            User.updateOne(
                {
                    userName: username,
                    "roughDrafts.id": draftId
                },
                {
                    $set: {
                        "roughDrafts.$.title": title,
                        "roughDrafts.$.subtitle": subtitle,
                        "roughDrafts.$.body": body,
                        "roughDrafts.$.timeOfLastEdit": timeOfLastEdit,
                    }
                },
                (error, data) => {
                    if (error) {
                        console.error("error message: ", error);
                    } else {
                        console.log("data", data);
                        response.json(
                            "Draft saved."
                        );
                    }
                }
            );
        }

        // add tags to the draft that the user is trying to post
    } else if (name === "addTagsToDraft") {
        console.log("updating tags of draft");
        const { draftId, data: tags } = request.body;
        User.updateOne(
            {
                userName: username,
                "roughDrafts.id": draftId
            },
            {
                $set:
                {
                    "roughDrafts.$.tags": tags
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
    } else if (name === "addNewDraft") {
        console.log("user wants to write a new rough draft.");
        const { data: draftId } = request.body;
        User.updateOne(
            { userName: username },
            { $push: { roughDrafts: draftId } },
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
    } else if (name === "deleteDraft") {
        const { data: draftId } = request.body;
        User.updateOne(
            { userName: username },
            {
                $pull: { roughDrafts: { id: draftId } }
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
    } else if (name === "draftCheck") {
        // how to check if a value is present in the database?
        console.log("check if draft is ok to be published")
        User.find({
            userName: username
        }).then(user => {
            // REFACTOR THIS CODE
            // draft sent from the front end
            const { _id, _title, _subtitle, _introPic, _body, _tags } = data;
            const drafts = user[0].roughDrafts;
            const draftInDB = drafts.find(_draft => _draft.id === _id);
            const { title: draftInDbTitle, subtitle: draftInDbSubtitle, introPic: draftInDbIntroPic, tags: draftInDBTags, body: draftInDbBody } = draftInDB
            const isTitleSame = draftInDbTitle === _title;
            const isSubTitleSame = _subtitle ? _subtitle === draftInDbSubtitle : undefined;
            const isIntroPicSame = _introPic ? ((_introPic.src === draftInDbIntroPic.src) && (_introPic.name === draftInDbIntroPic.name)) : undefined;
            const isBodySame = _body === draftInDbBody;
            const areTagsSame = JSON.stringify(_tags) === JSON.stringify(draftInDBTags);
            if (
                (isTitleSame && isSubTitleSame && isIntroPicSame && isBodySame && areTagsSame) ||
                (isTitleSame && (isSubTitleSame === undefined) && isIntroPicSame && isBodySame && areTagsSame) ||
                (isTitleSame && isSubTitleSame && (isIntroPicSame === undefined) && isBodySame && areTagsSame) ||
                (isTitleSame && (isSubTitleSame === undefined) && (isIntroPicSame === undefined) && isBodySame && areTagsSame)
            ) {
                console.log("moving user draft to published field");
                User.updateOne(
                    { userName: username },
                    {
                        $push: {
                            publishedDrafts: _id
                        },
                        $pull: {
                            roughDrafts: { id: _id }
                        }
                    },
                    (error, numbersAffected) => {
                        if (error) throw error;
                        else {
                            console.log("numbersAffected", numbersAffected);
                            response.json({
                                message: "success"
                            });
                        }
                    }
                );
            } else {
                // if the any of the criteria returns to be false, then tell the user that an error has occurred
                console.log("data that was received doesn't match with the data stored in DB.")
                response.json({
                    message: "ERROR"
                })
            }
        })
    } else if (name === "userCommented") {
        console.log("data userCommented", data)
        // GOAL: store the id of the post and the user comment into user.activities field under the subfield of comments
        // the user activities for comments is updated with the following: {locationPost: string, comments: [new comment id added]}
        // if it doesn't exist, then create a new object with the with the following object added into the commentsId field: {locationPost: string, comments: [new comment id added]}
        // if it exists, then push the new data into the commentsId field
        // check if the postId already exists in the array that is stored activities.comments
        // access the activities.comments field of the user profile
        // using user's id, find the user's profile
        // the following package is retrieved from the frontend: {name: "userCommented", userId: string, data: {locationPost: string, newComment: id of the comment}}
        const { userId, postId } = request.body;
        const { newCommentId, fieldName } = data;
        // NOTES: 
        // first check if the postId containing all of the comments ids exist already in the activities.comments field 
        // if it exists, then push the new comment into the commentsId field in respects to the post that the comment is located in
        // if the post doesn't exist, therefore the comment is the first comment onto the post by the user, create a new object with the following fields: {postId, commentIds:[]}

        // GOAL:  find if the postId exists in the comments array of activities.comments
        // NOTES: 
        // handle situations when there is no activities field in the user's document

        // CASES:
        // CASE1:
        // if the user already commented on a post, then first target the targeted field, find the user id in the nested targeted field, and push the new comment into that field
        // if this is the first time that the user is commented on the post, check if within user.activities.comments.$[comment]._id is equal to the postId
        // if the above is true, then locate its comments array--or the targeted field--and push the new comment
        // if not, then push the new activity into the user.activities.targetField
        const element = fieldName.slice(0, -1);
        const activityField = `activities.${fieldName}`;
        const activityFieldId = `activities.${fieldName}.$[${element}]._id`;
        const activity = {
            _id: postId,
            commentIds: [{ _id: newCommentId }]
        };
        // GET THE IDS ARRAY OF THE TARGETED FIELD:
        let fieldIds;
        if (fieldName === "comments") {
            fieldIds = "commentsId";
        } else if (fieldName === "replies") {
            fieldIds = "repliesId";
        } else if (fieldName === "posts") {
            fieldIds = "postIds"
        }
        // GOAL: get the commentIds, repliesId, or the postIds of the activities field
        const targetField = `activities.${fieldName}.$[${element}].${fieldIds}`;
        console.log(targetField)
        User.find(
            { _id: userId },
            { activities: 1, _id: 0 }
        ).then(results => {
            // GOAL: check if the post that the user commented on exists within the target field
            // CASE1: if the activities field is empty, then create the activities field with the code below
            // CASE2: if the activities field does exist, then check if the target field (comments, replies, or likes) exists. If the target field exists, then check if the user has already commented on the post. If the user already has, then locate the post and push the new activity--push its id. 
            // GOAL: push the new comment into its respective post in the activities field  
            const { activities } = results[0];
            console.log({ activities })
            console.log(activities[fieldName])
            if (activities && (activities[fieldName] && activities[fieldName].length)) {
                const isTargetPostPresent = activities[fieldName].find(activity => activity._id === postId);
                console.log({ isTargetPostPresent })
                if (isTargetPostPresent) {
                    User.updateOne(
                        { _id: userId },
                        {
                            $push:
                            {
                                [targetField]: activity
                            }
                        },
                        {
                            multi: false,
                            arrayFilters: [{ [`${element}._id`]: postId }]
                        },
                        (error, numsAffected) => {
                            if (error) throw error;
                            else {
                                console.log({ numsAffected })
                            }
                        }
                    )
                }
            }
        })



        // User.updateOne(
        //     { _id: userId },
        //     {
        //         $push:
        //         {
        //             [activityField]: activity
        //         }
        //     },
        //     (error, numsAffect) => {
        //         if (error) throw error;
        //         console.log(numsAffect);
        //     }
        // )

        response.json(
            "update completed"
        );

        // User.updateOne(
        //     {
        //         _id: userId,
        //     },
        //     {
        //         $push:
        //         {
        //             "activities.comments.$[comment].commentIds": newCommentId
        //         }
        //     },
        //     {
        //         arrayFilters: [{ "comment.postId": postId }]
        //     },
        //     (error, numbersAffected) => {
        //         if (error) throw error;
        //         else {
        //             console.log("numbersAffected", numbersAffected);
        //         }
        //     }
        // )

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
    } else if (package.name === "getUserInfo") {
        console.log("package.postId: ", package.postId);
        res.json("request received")
    }
});

router.route("/users").get((req, res) => {
    console.log("getting all users");
    User.find()
        .then(users => res.json(users))
})





module.exports = router;
