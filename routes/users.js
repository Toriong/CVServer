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
        const { postId: _postId } = data;
        console.log("tracking user activity")
        User.updateOne(
            { _id: userId },
            {
                $push: {
                    "activities.comments": { _id: _postId }
                }
            },
            (error, numsAffect) => {
                if (error) throw error;
                else {
                    console.log("user added another comment on the same post.", numsAffect);
                    response.json(
                        "user comment activity updated"
                    )
                }
            }
        )
    } else if (name === "userRepliedToComment") {
        const { userId } = request.body;
        const { commentId, postId, replyId } = data;
        const _commentId = { _id: commentId };
        console.log({
            commentId,
            postId,
            replyId
        })
        User.find(
            {
                _id: userId,
                "activities.replies": { $exists: true }
            },
            { activities: 1, _id: 0 }
        ).then(results => {
            console.log("results", results)
            const { replies } = results.length && results[0].activities;
            if (results.length && replies.length) {
                const post = replies.find(({ _id }) => _id === postId);
                if (post) {
                    console.log("user replied to a different comment.")
                    User.updateOne(
                        {
                            _id: userId,
                        },
                        {
                            $push:
                            {
                                "activities.replies.$[comment].idsOfCommentsRepliedTo": _commentId
                            }
                        },
                        {
                            multi: false,
                            arrayFilters: [
                                { "comment._id": postId }
                            ],
                            upsert: true
                        },
                        (error, numsAffected) => {
                            if (error) throw error;
                            else {
                                console.log({ numsAffected })
                            }
                        }
                    );
                } else {
                    console.log("first reply by user on new post.");
                    User.updateOne(
                        {
                            _id: userId,
                        },
                        {
                            $push:
                            {
                                "activities.replies": {
                                    _id: postId,
                                    idsOfCommentsRepliedTo: [_commentId]
                                }
                            }
                        },
                        (error, numsAffected) => {
                            if (error) throw error;
                            else {
                                console.log({ numsAffected })
                            }
                        }
                    );
                }
            } else {
                console.log("executed, berries")
                const replies = {
                    _id: postId,
                    idsOfCommentsRepliedTo: [_commentId]
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
    } else if (name === "userLikedPost") {
        // GOAL: have user like activity be only sent to the server once
        const { signedInUserId: userId } = request.body;
        const { postId } = data;
        User.updateOne(
            { _id: userId },
            {
                $push:
                {
                    "activities.likes.posts": { postId }
                }
            },
            (error, numsAffected) => {
                if (error) throw error;
                else {
                    console.log(`User liked a post. NumsAffectd: `, numsAffected);
                    User.find(
                        { _id: userId },
                        { activities: 1, _id: 0 }
                    ).then(results => {
                        console.log("results 482", results)
                        const { activities } = results[0]
                        response.json(activities);
                    })
                }
            }
        )
    } else if (name === "userLikedComment") {
        const { signedInUserId: userId } = request.body
        const { postId, commentId } = data;
        User.find(
            {
                _id: userId,
                "activities.comments": { $exists: true }
            },
            {
                _id: 0,
                "activities.likes": 1
            }
        )
            .then(results => {
                // GOAL: check if there is something in results and if there is something in likes.comments
                console.log("results", results)
                const { comments } = results[0].activities.likes;
                if (comments && comments.length) {
                    const post = comments.find(({ postId: _postId }) => _postId === postId);
                    if (post) {
                        console.log("post.idsOfCommentsLiked", post.idsOfCommentsLiked)
                        const isCommentIdPresent = post.idsOfCommentsLiked.find(id => id === commentId);
                        console.log("isCommentIdPresent: ", isCommentIdPresent)
                        if (isCommentIdPresent) {
                            // if the comment id is present then don't do anything
                            console.log("comment id is present");
                            response.json("Comment id is present. No modifications occurred with DB.")
                        } else {
                            console.log("commentId 558", commentId)
                            User.updateOne(
                                { _id: userId },
                                {
                                    $push:
                                    {
                                        "activities.likes.comments.$[val].idsOfCommentsLiked": commentId
                                    }
                                },
                                {
                                    multi: false,
                                    arrayFilters: [{ "val.postId": postId }]
                                },
                                (error, numsAffected) => {
                                    if (error) throw error;
                                    else {
                                        console.log(`User liked another comment in the same post. NumsAffectd: `, numsAffected);
                                        response.json("User like for a comment in the same post is tracked and saved into DB.")
                                    }
                                }
                            )
                        }
                    }

                } else {
                    User.updateOne(
                        { _id: userId },
                        {
                            $push:
                            {
                                "activities.likes.comments":
                                {
                                    postId,
                                    idsOfCommentsLiked: [commentId]
                                }
                            }
                        },
                        (error, numsAffected) => {
                            if (error) throw error;
                            else {
                                console.log(`User liked a comment. NumsAffectd: `, numsAffected);
                                response.json("User like tracked and saved into DB.")
                            }
                        }
                    )
                }
            })
    } else if (name === "userLikedReply") {
        // GOAL: store the id of the reply into its respective comment in the user.activities
        //CASE1: the user likes a reply for the first time, push the following into user.activities.likes.replies: [{postId, repliedToComments: [{commentId, likedRepliesIds}]}]
        // CASE2: the user likes a reply, but they are other replies that user liked as well for the same comment. Push the id of the reply into likedRepliesIds.
        // CASE3: the use likes a reply, but for a different comment in the same post. find the post id and push the following into repliedToComments: {commentId, likedRepliesIds: {the id of the liked reply}}
        // CASE4: THE user likes a reply in a different post that no replies were liked in that post. Push into user.activities.likes.replies: {postId, repliedToComments: [{commentId, likedRepliesIds}]}

        // GOAL: when the user likes a reply for the first time, push the following into activities.likes.replies: {postId, repliedToComments: [{commentId, likedRepliesIds}]}
        // if all of the checks passes, then the following is pushed into activities.likes.replies: {postId, repliedToComments: [{commentId, likedRepliesIds}]}
        // check if the results are empty
        // check if there is nothing in "activities.likes.replies"
        // access the user.activities field
        // the user is found using the userId
        // the following is received from the front-end: {the name of te package: user liked a reply, userId, data: {postId, commentId, replyId} }
        const { signedInUserId: userId } = req.body
        const { commentId, replyId } = data;
        User.find(
            {
                _id: userId,
                "activities.likes.replies": { $exist: true }
            }
        )
            .then(results => {
                // check if the query works and what your get from it
                console.log("results", results);
            })
        res.json("post request received tracking user's acetivity")
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
        .then(users => res.json(users))
})





module.exports = router;
