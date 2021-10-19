const express = require('express');
const { useImperativeHandle } = require('react');
const router = express.Router();
const User = require("../models/user");



const getId = () => JSON.stringify(Math.floor(Math.random() * 10000000000000000000000000000));


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
};

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
    const { name, username, data, userId } = request.body
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
                    _id: userId,
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
                    _id: userId,
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
                _id: userId,
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
        const { data: newDraft } = request.body;
        User.updateOne(
            { _id: userId },
            { $push: { roughDrafts: newDraft } },
            (err, numsAffected) => {
                if (err) {
                    console.error("error message: ", err);
                } else {
                    console.log("user started a new draft: ", numsAffected);
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
            _id: userId
        }).then(user => {
            // REFACTOR THIS CODE
            // draft sent from the front end
            // get everything from the db and stringify it
            // send the data from the front-end in a stringify form 
            // compare the two
            // if the two are the same, then go ahead with posting the data
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
                    { _id: userId },
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
        const { postId: postIdOfComment } = data;
        console.log("tracking user activity")
        User.updateOne(
            { _id: userId },
            {
                $addToSet: {
                    "activities.comments": { postIdOfComment }
                }
            },
            (error, numsAffected) => {
                if (error) throw error;
                else {
                    console.log(`User commented, 360: ${numsAffected}`);
                    User.find(
                        { _id: userId },
                        { activities: 1, _id: 0 }
                    ).then(results => {
                        console.log("results 416", results)
                        const { activities } = results[0]
                        response.json(activities);
                    })
                }
            }
        )
    } else if (name === "userRepliedToComment") {
        const { signedInUserId: userId, isSamePost } = request.body;
        const { commentId } = data;
        if (isSamePost) {
            const { postId } = request.body;
            User.updateOne(
                { _id: userId },
                {
                    $addToSet:
                    {
                        "activities.replies.$[postId].repliedToCommentIds": commentId
                    }
                },
                {
                    multi: false,
                    arrayFilters: [{ "postId.postId": postId }]
                },
                (error, numsAffected) => {
                    if (error) throw error;
                    else {
                        console.log(`User replied to a comment, 411: ${numsAffected}`);
                        User.find(
                            { _id: userId },
                            { activities: 1, _id: 0 }
                        ).then(results => {
                            console.log("results 416", results)
                            const { activities } = results[0]
                            response.json(activities);
                        })
                    }
                }
            );
        } else {
            const { postId } = data;
            const newReplyActivity = {
                postId,
                repliedToCommentIds: [commentId]
            }
            User.updateOne(
                { _id: userId },
                {
                    $addToSet:
                    {
                        "activities.replies": newReplyActivity
                    }
                },
                (error, numsAffected) => {
                    if (error) throw error;
                    else {
                        console.log(`User replied to a comment, 411: ${numsAffected}`);
                        User.find(
                            { _id: userId },
                            { activities: 1, _id: 0 }
                        ).then(results => {
                            console.log("results 416", results)
                            const { activities } = results[0]
                            response.json(activities);
                        })
                    }
                }
            );
        }


    } else if (name === "userLikedPost") {
        // GOAL: have user like activity be only sent to the server once
        const { userId } = request.body;
        const { postId } = data;
        User.updateOne(
            { _id: userId },
            {
                $addToSet:
                {
                    "activities.likes.likedPostIds": postId
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
                        console.log("results 483", results)
                        const { activities } = results[0]
                        response.json(activities);
                    })
                }
            }
        )
    } else if (name === "userLikedComment") {
        const { signedInUserId: userId, postId, isSamePost } = request.body
        if (isSamePost) {
            const { commentId } = data;
            User.updateOne(
                { _id: userId },
                {
                    $addToSet:
                    {
                        "activities.likes.postIdsAndLikedComments.$[postId].likedCommentIds": commentId
                    }
                },
                {
                    multi: false,
                    arrayFilters: [{ "postId.postId": postId }]
                },
                (error, numsAffected) => {
                    if (error) throw error;
                    else {
                        console.log(`User liked a comment. NumsAffectd: `, numsAffected);
                        User.find(
                            { _id: userId },
                            { activities: 1, _id: 0 }
                        ).then(results => {
                            console.log("results 513", results)
                            const { activities } = results[0]
                            response.json(activities);
                        })
                    }
                }
            )
        } else {
            const { postId, commentId } = data;
            const postIdAndLikedCommentsIds = { postId, likedCommentIds: [commentId] }
            User.updateOne(
                { _id: userId },
                {
                    $addToSet:
                    {
                        "activities.likes.postIdsAndLikedComments": postIdAndLikedCommentsIds
                    }
                },
                (error, numsAffected) => {
                    if (error) throw error;
                    else {
                        console.log(`User liked a comment on a different post. NumsAffectd: ${numsAffected}`);
                        User.find(
                            { _id: userId },
                            { activities: 1, _id: 0 }
                        ).then(results => {
                            console.log("results 545", results)
                            const { activities } = results[0]
                            response.json(activities);
                        })
                    }
                }
            )
        }






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
        const { signedInUserId: userId, isSamePost, isSameComment } = request.body
        const { replyId } = data;
        //GOAL: if isSamePost and isSameComment, then find the post postIdsCommentIdsAndLikedReplyIds and find the target comment in commetIdsAndLikedReplyIds and push the likedReplyId into LikedReplyIds
        //GOAL: if isSamePost and isSameComment is undefined (therefore false, it is a liked reply in a new post), then push the following into activities.likes.replies {postId, commentIdsAndLikedReplys: [{commentId, likedReplyIds}]}
        // GOAL: if isSamePost, then find the post activities.likes.replies and push the new liked reply and its comment into commentIdsAndLikedReplyIds 
        console.log('isSameComment', isSameComment)
        if (isSamePost && isSameComment) {
            // GOAL: implement case3
            const { commentId, postId } = request.body;
            User.updateOne(
                { _id: userId },
                {
                    $addToSet:
                    {
                        "activities.likes.postIdsCommentIdsAndLikedReplies.$[post].commentIdsAndLikedReplyIds.$[comment].likedReplyIds": replyId
                    }
                },
                {
                    multi: false,
                    arrayFilters: [{ "post.postId": postId }, { "comment.commentId": commentId }]
                },
                (error, numsAffect) => {
                    if (error) {
                        console.error(`Error message 597: ${error}`)
                    } else {
                        console.log("user liked reply to the same comment on the same post.", numsAffect);
                        User.find(
                            { _id: userId },
                            { activities: 1, _id: 0 }
                        ).then(results => {
                            const { activities } = results[0]
                            response.json(activities);
                        })
                    }
                }
            )

        } else if (isSamePost && (isSameComment === undefined)) {
            const { postId } = request.body
            const { commentId, replyId } = data;
            const newReplyActivity = {
                commentId,
                likedReplyIds: [replyId]
            }
            User.updateOne(
                { _id: userId },
                {
                    $addToSet:
                    {
                        "activities.likes.postIdsCommentIdsAndLikedReplies.$[post].commentIdsAndLikedReplyIds": newReplyActivity
                    }
                },
                {
                    multi: false,
                    arrayFilters: [{ "post.postId": postId }]
                },
                (error, numsAffect) => {
                    if (error) {
                        console.error(`Error message 597: ${error}`)
                    } else {
                        console.log("user liked reply to a new comment on the same post.", numsAffect);
                        User.find(
                            { _id: userId },
                            { activities: 1, _id: 0 }
                        ).then(results => {
                            const { activities } = results[0]
                            response.json(activities);
                        })
                    }
                }

            )
        } else {
            const { commentId, postId } = data;
            const newReplyActivity = {
                postId,
                commentIdsAndLikedReplyIds: [{ commentId, likedReplyIds: [replyId] }]
            }
            User.updateOne(
                { _id: userId },
                {
                    $addToSet:
                    {
                        "activities.likes.postIdsCommentIdsAndLikedReplies": newReplyActivity
                    }
                },
                (error, numsAffect) => {
                    if (error) {
                        console.error(`Error message 592: ${error}`)
                    } else {
                        console.log("user liked reply on new post.", numsAffect);
                        User.find(
                            { _id: userId },
                            { activities: 1, _id: 0 }
                        ).then(results => {
                            const { activities } = results[0]
                            response.json(activities);
                        })
                    }
                }

            )
        }
    } else if (name === "followUser") {
        const { newFollowingUserId, signedInUserId, followedUserAt } = data;
        User.findByIdAndUpdate(signedInUserId,
            {
                $push:
                {
                    "activities.following": { userId: newFollowingUserId, followedUserAt }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error(`Error message 667: ${error}`)
                } else {
                    console.log(`New following added, numsAffected: ${numsAffected}`)
                }
            }
        );
        // IN DISPLAYING THE notifications, show the follower and the time of the follow
        User.findByIdAndUpdate(newFollowingUserId,
            {
                $addToSet:
                {
                    followers: { userId: signedInUserId, wasFollowedAt: followedUserAt },
                    notifications:
                    {
                        newFollower: signedInUserId,
                        wasSeen: false
                    }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error(`Error message 687: ${error}`)
                } else {
                    console.log(`User is being followed by ${signedInUserId}. numsAffected: ${numsAffected}`)
                    response.json({ newFollowingUserId, signedInUserId, wasDbUpdated: true });
                }
            }
        );
    } else if (name === "unFollowUser") {
        const { unFollowUser, signedInUserId: userId_ } = request.body;
        User.findByIdAndUpdate(userId_,
            {
                $pull:
                {
                    "activities.following": { userId: unFollowUser }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error(`Error message 667: ${error}`)
                } else {
                    console.log(`New following added, numsAffected: ${numsAffected}`)
                }
            }
        );
        // how to tell if an element was seen on the UI?
        User.findByIdAndUpdate(unFollowUser,
            {
                $pull:
                {
                    followers: { userId: userId_ },
                    notifications: { newFollower: userId_ }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error(`Error message 687: ${error}`)
                } else {
                    console.log(`User was unFollowed. numsAffected: ${numsAffected}`)
                    response.json("User was unFollowed")
                }
            }
        );
    } else if (name === "saveIntoReadingList") {
        const { signedInUserId: userId, wasListCreated, listName: title, isPrivate, newPostSaved } = request.body;
        if ((isPrivate || isPrivate === false) && wasListCreated) {
            // how to allow duplicate fields in MONGODB?
            const { savedAt: listCreatedAt } = newPostSaved;
            User.updateOne({ _id: userId },
                {
                    $addToSet:
                    {
                        [`readingLists.${title}.list`]: newPostSaved
                    },
                    $set:
                    {
                        [`readingLists.${title}.isPrivate`]: isPrivate,
                        [`readingLists.${title}.createdAt`]: listCreatedAt
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error(`Error message 719: ${error}`);
                    }
                    console.log("Custom post saved into DB, privacy changed. Custom reading list was created. NumsAffected: ", numsAffected);
                    response.json("post saved into user's reading list.");
                }
            );
        } else if (isPrivate || isPrivate === false) {
            User.updateOne({ _id: userId },
                {
                    $addToSet:
                    {
                        [`readingLists.${title}.list`]: newPostSaved
                    },
                    $set:
                    {
                        [`readingLists.${title}.isPrivate`]: isPrivate
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error(`Error message 719: ${error}`);
                    }
                    console.log("Custom post saved into DB, privacy changed. NumsAffected: ", numsAffected);
                    response.json("post saved into user's reading list.");
                }
            );
        } else {
            console.log('new post saved')
            User.updateOne({ _id: userId },
                {
                    $addToSet:
                    {
                        [`readingLists.${title}.list`]: newPostSaved
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error(`Error message 719: ${error}`);
                    }
                    console.log("Custom post saved into DB, numsAffected: ", numsAffected);
                    response.json("post saved into user's reading list.");
                }
            );
        }
    } else if (name === 'deleteFromReadingList') {
        const { signedInUserId: userId, selectedPostId: postId_, listName: title } = request.body;
        User.updateOne(
            { _id: userId },
            {
                $pull:
                {
                    [`readingLists.${title}.list`]: { postId: postId_ }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.log("deleteFromReadingList, error message: ", error)
                };
                console.log("User deleted post from reading list, numsAffected: ", numsAffected);
                response.json("Post deleted from reading list.")
            }
        )
    }
})

// USE THE ID OF THE USER INSTEAD TO FIND THE USER
router.route("/users/:package").get((request, response) => {
    const package = JSON.parse(request.params.package);
    const { password, name, userId, username } = package;
    if (name === "signInAttempt") {
        console.log("user wants to sign in")
        User.find({ username: username }).then(user => {
            console.log("user[0].username: ", user[0].username)
            const { username: username_, firstName, lastName, icon, _id, password: password_ } = user[0];
            console.log("password_: ", password_)
            if (password === password_) {
                console.log("user signed back in")
                response.json({
                    message: `Welcome back ${username_}!`,
                    user: {
                        _id,
                        icon,
                        username_,
                        firstName,
                        lastName
                    }
                });
            } else {
                console.error("Sign-in attempt FAILED");
                response.json({
                    message: "Invalid username or password.",
                })
            }
        }).catch(error => {
            if (error) {
                console.error("Sign-in attempt FAILED");
                response.json({
                    message: "Invalid username or password."
                })
            }
        });
        console.log("wtf yo")
    } else if (name === "getRoughDrafts") {
        User.findById(userId).then(user_ => {
            console.log("user_", user_)
            console.log("getting user's rough drafts")
            const { roughDrafts } = user_
            response.json(
                roughDrafts
            )
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
        // GOAL: get all of the tags that user likes
    } else if (name === "getUsersTopicsFollowingAndReadingList") {
        console.log("the user is on the feed page");
        User.findById(
            userId,
            error => {
                if (error) {
                    console.error(`Error message: ${error}`);
                }
            }
        ).then(user => {

            console.log("following: ", user.activities.following);
            const following = (user.activities && user.activities.following && user.activities.following.length) && user.activities.following;
            const topics = (user && user.topics) && user.topics;
            const readingLists = user.readingLists && user.readingLists;
            console.log('readingLists: ', readingLists)
            let _package = {};
            if (following) {
                _package = {
                    following
                }
            }
            if (readingLists) {
                _package = {
                    ..._package,
                    readingLists
                }
            }
            if (topics) {
                _package = {
                    ..._package,
                    topics
                };
            };
            if (_package !== {}) {
                response.json({ _package })
            } else {
                response.json("no topics, following, nor reading list items are present")
            }
        })
    }
});

router.route("/users").get((req, res) => {
    console.log("getting all users");
    User.find()
        .then(users => res.json(users))
})





module.exports = router;
