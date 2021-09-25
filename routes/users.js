const express = require('express');
const router = express.Router();
const User = require("../models/user");


const pushNewPostCommentedActivity = (commentId, postId, userId) => {
    const activity = {
        _id: postId,
        commentIds: [{ _id: commentId }]
    }
    User.updateOne(
        { _id: userId },
        {
            $push:
            {
                "activities.comments": activity
            }
        },
        (error, numsAffect) => {
            if (error) throw error;
            else {
                console.log("new comment on post was added.", numsAffect);
            }
        }
    )
};

const checkIfValIsPresent = (array, comparison) => {
    return array.find(val => val._id === comparison) !== undefined;
}

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
        // GOAL: update the user activities.comments when the user comments on a post 
        // receive thea package from the front end, that consist of postId, the userCommentItd
        // do a find query and check if the postId is present in the array that is stored in activities.comments
        // check if the user already commented on the post in activities.comments
        // if the user already commented on the post, then--in activities.comments--find the post by way of the postId and push the new comment id into commentIds
        // if the user hasn't commented on the post yet, then push the {postId, commentId} into activities.comments
        console.log("data userCommented", data)
        const { userId } = request.body;
        const { newCommentId: commentId, postId: _postId } = data;


        User.find(
            {
                _id: userId,
                "activities.comments._id": _postId
            },
            { activities: 1, _id: 0 }
        ).then(results => {
            // don't search through the results if the results are empty
            if (results.length) {
                const { activities } = results[0];
                const { comments } = activities;
                const isCommentPresent = comments.length && checkIfValIsPresent(comments, _postId)
                if (isCommentPresent) {
                    // const _comments = comments.map(comment => {
                    //     const { _id, commentIds } = comment;
                    //     if (_id === postId) {
                    //         return {
                    //             ...comment,
                    //             commentIds: [...commentIds, commentId]
                    //         }
                    //     }
                    //     return comment;
                    // });
                    console.log("user commented on post already, pushing new comment onto post")
                    User.updateOne(
                        { _id: userId },
                        {
                            $push: {
                                "activities.comments.$[comment].commentIds": commentId
                            }
                        },
                        {
                            arrayFilters: [{ "comment._id": _postId }]
                        },
                        (error, numsAffect) => {
                            if (error) throw error;
                            else {
                                console.log("user added another comment on the same post.", numsAffect);
                            }
                        }
                    )
                } else {
                    console.log("hello there 321")
                    pushNewPostCommentedActivity(commentId, _postId, userId)
                }
            } else {
                console.log("hello there 325")
                pushNewPostCommentedActivity(commentId, _postId, userId)
            }

            // const { comments } = activities;
            // if (comments && (comments.length && checkIfValIsPresent(comments, postId))) {

            // }

        })





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
