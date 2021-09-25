const express = require('express');
const router = express.Router();
const User = require("../models/user");


const pushCommentedActivity = (commentId, postId, userId, isCommentOnNewPost) => {
    const activity = {
        _id: postId,
        commentIds: [{ _id: commentId }]
    }
    if (isCommentOnNewPost) {
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
    } else {
        User.updateOne(
            { _id: userId },
            {
                $push: {
                    "activities.comments.$[comment].commentIds": { _id: commentId }
                }
            },
            {
                arrayFilters: [{ "comment._id": postId }]
            },
            (error, numsAffect) => {
                if (error) throw error;
                else {
                    console.log("user added another comment on the same post.", numsAffect);
                }
            }
        )
    }
};


// NOTES:
// first check if the user reply is on the same post
// second, check if the user reply is on the same comment

// CASES:
// CASE1: user replies to multiple comments on the same post
//GOAL: push the following object into the replyIds of the post that the user already replied on: {_id: replyId}
// locate the post in activities.replies by using the postId
// push the new replyId into activities.replies.targetComment.replyIds

// CASE2: user posts a new reply and is the first reply onto a post 
// GOAL: push a new replyActivity into the activities.replies
// pass in the following 
const pushReplyActivity = (commentId, postId, replyId, userId, isReplyOnNewPost, isReplyOnNewComment) => {
    const activity = {
        _id: postId,
        commentId: commentId,
        replyIds: [{ _id: replyId }]
    }
    // check for the following:
    if (isReplyOnNewPost) {
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
    } else {
        User.updateOne(
            { _id: userId },
            {
                $push: {
                    "activities.comments.$[comment].commentIds": { _id: commentId }
                }
            },
            {
                arrayFilters: [{ "comment._id": postId }]
            },
            (error, numsAffect) => {
                if (error) throw error;
                else {
                    console.log("user added another comment on the same post.", numsAffect);
                }
            }
        )
    }
}

const checkIfValIsInArray = (array, comparison) => {
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
                const isCommentPresent = comments.length && checkIfValIsInArray(comments, _postId)
                if (isCommentPresent) {
                    pushCommentedActivity(commentId, _postId, userId)
                } else {
                    console.log("hello there 321")
                    pushCommentedActivity(commentId, _postId, userId, true)
                }
            } else {
                console.log("hello there 325")
                pushCommentedActivity(commentId, _postId, userId, true)
            }
        })
        response.json(
            "update completed, user activity tracked"
        );
    } else if (name === "userRepliedToComment") {
        const { userId } = request.body;
        const { commentId, postId, replyId } = data;
        console.log({
            commentId,
            postId,
            replyId
        })
        // GOAL: check if the user already replied to the comment already in their activity field
        User.find(
            {
                _id: userId,
                "activities.replies": { $exists: true }
            },
            { activities: 1, _id: 0 }
        ).then(results => {
            // CHECKS: 
            // CHECK 1) if user replies on a post that the user already replied on
            // GOAL: if no, then push the following into user.activities.replies: {activities.replies: [{["id of the post"], replies:[{idOfCommentThatUserIsReplyingto, replyIdsArray}]]}

            // CHECK 2) if user replies to a comment that the user already replied to
            // if yes, then push the following into the replyIds array: {_id: the id of the reply}
            //push the replyId into the array that is stored in replyIds
            // find the comment that the user replied to by using the commentId
            // find the post that the user replied on by using the postId
            // access activities.replies
            // find the user account by using the userId
            // package received with the following: {commentId, postId, replyId, userId}


            // GOAL: push the following into replySchema.comments: {_id of the comment, comments: [{id of the comment, replyIds: [{_id: the id of the reply}]}]}
            // the post is found, the following is pushed into replySchema.comments: {_id of the comment, comments: [{id of the comment, replyIds: [{_id: the id of the reply}]}]}
            // find the post that the user already commented on by using the postID 
            // access the activities.replies 
            // find the user profile by using the userId {_id: userId}
            // package received with the following: {commentId, postId, replyId, userId} 
            if (results.length) {



                // user commented on: get the blog post 
                // user replied to a comment: get the blog post and the comment id 
                const { replies } = results[0].activities;
                const post = replies.find(({ _id }) => _id === postId);
                if (post) {
                    console.log("user has commented on this post")
                    const { repliedToCommentIds } = post;
                    if (checkIfValIsInArray(repliedToCommentIds, commentId)) {
                        console.log("user has replied to this comment already")
                        User.updateOne(
                            {
                                _id: userId,
                            },
                            {
                                $push:
                                {
                                    "activities.replies.$[reply].repliedToCommentIds.$[commentId].idsOfReplies": { _id: replyId }
                                }
                            },
                            {
                                multi: false,
                                arrayFilters: [
                                    { "commentId._id": commentId },
                                    { "reply._id": postId }
                                ],
                                upsert: true
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
            } else {
                // GOAL: if the results are none, then push the follow nested field for the activities.replies: {activities.replies: [{["id of the post"], replies:[{idOfCommentThatUserIsReplyingto, replyIds}]]}
                // the following is pushed into activities.replies, thus creating the field if it hasn't been created yet: {activities.replies: [{["id of the post"], replies:[{idOfCommentThatUserIsReplyingto, replyIds}]]}
                // find the user by using the user's id
                const newReply = {
                    _id: commentId,
                    idsOfReplies: [{ _id: replyId }]
                }
                const replies = {
                    _id: postId,
                    repliedToCommentIds: [newReply]
                }
                User.updateOne(
                    { _id: userId },
                    {
                        $push:
                        {
                            "activities.replies": replies
                        }
                    },
                    (error, numsAffected) => {
                        if (error) throw error;
                        else {
                            console.log({ numsAffected })
                        }
                    }
                )
            }
        })
        response.json(
            "update completed, user activity tracked"
        );
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
