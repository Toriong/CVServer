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
        const { draftId, data, type } = request.body;
        console.log("data: ", data);
        const { title, subtitle, introPic, timeOfLastEdit, body } = data;
        if (type === 'body') {
            User.updateOne(
                {
                    _id: userId,
                    "roughDrafts._id": draftId
                },
                {
                    $set: {
                        "roughDrafts.$.body": body,
                        "roughDrafts.$.timeOfLastEdit": timeOfLastEdit,
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                    } else {
                        console.log("Body updated, draft saved. NumsAffected:", numsAffected);
                        response.json(
                            "Body updated, draft saved."
                        );
                    }
                }
            )
        } else if (type === 'title') {
            User.updateOne(
                {
                    _id: userId,
                    "roughDrafts._id": draftId
                },
                {
                    $set: {
                        "roughDrafts.$.title": title,
                        "roughDrafts.$.timeOfLastEdit": timeOfLastEdit,
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                    } else {
                        console.log("title updated, draft saved. NumsAffected:", numsAffected);
                        response.json(
                            "title updated, draft saved."
                        );
                    }
                }
            )
        } else if (type === 'subtitle') {
            User.updateOne(
                {
                    _id: userId,
                    "roughDrafts._id": draftId
                },
                {
                    $set: {
                        "roughDrafts.$.subtitle": subtitle,
                        "roughDrafts.$.timeOfLastEdit": timeOfLastEdit,
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                    } else {
                        console.log("subtitle updated, draft saved. NumsAffected:", numsAffected);
                        response.json(
                            "subtitle updated, draft saved."
                        );
                    }
                }
            );
        } else if (type === 'introPic') {
            User.updateOne(
                {
                    _id: userId,
                    "roughDrafts._id": draftId
                },
                {
                    $set: {
                        "roughDrafts.$.introPic": introPic,
                        "roughDrafts.$.timeOfLastEdit": timeOfLastEdit,
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                    } else {
                        console.log("IntroPic updated, draft saved. NumsAffected:", numsAffected);
                        response.json(
                            "IntroPic updated, draft saved."
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
                "roughDrafts._id": draftId
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
            const { _id: draftId } = data;
            const { introPic: introPicFromFront, subtitle: subtitleFromFront, ...draftFromFrontEnd } = data;
            const drafts = user[0].roughDrafts;
            const draftInDB = drafts.find(({ _id: _draftId }) => _draftId === draftId);
            const { introPic, defaultTitle, timeOfLastEdit, creation, subtitle, ...draftInDB_ } = draftInDB;
            const isIntroPicSame = !((introPic === null) && (introPicFromFront === undefined)) ? JSON.stringify(introPic) === JSON.stringify(introPicFromFront) : 'noIntroPicChosen'
            const isSubtitleSame = !((subtitle === '') && (subtitleFromFront === undefined)) ? (subtitle === subtitleFromFront) : 'noSubtitleChosen';
            const isTheRestOfDraftDataSame = JSON.stringify(draftInDB_) === JSON.stringify(draftFromFrontEnd);
            console.log({ isIntroPicSame, isSubtitleSame, isTheRestOfDraftDataSame })
            if ((isIntroPicSame === 'noIntroPicChosen') && (isSubtitleSame === 'noSubtitleChosen') && isTheRestOfDraftDataSame) {
                console.log("same draft data, neither subtitle nor introPic has been chosen");
            } else if (isIntroPicSame && (isSubtitleSame === 'noSubtitleChosen') && isTheRestOfDraftDataSame) {
                console.log("same draft data, subtitle has not been chosen");
            } else if ((isIntroPicSame === 'noIntroPicChosen') && isSubtitleSame && isTheRestOfDraftDataSame) {
                console.log("same draft data, introPic has not been chosen");
            } else if (isIntroPicSame && isSubtitleSame && isTheRestOfDraftDataSame) {
                console.log("same draft data, introPic and subtitle has been chosen.");
            } else {
                console.log("Check completed. Drafts are not the same.")
            };


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
    } else if (name === 'getTargetDraft') {
        const { draftId } = package;
        // console.log({
        // userId,
        // draftId
        // })
        User.findById(
            {
                _id: userId,
            },
            {
                roughDrafts: 1,
                _id: 0
            }
        ).then(result => {
            const { roughDrafts } = result;
            const { _id, ...targetedDraft } = roughDrafts.find(({ _id }) => _id === draftId);
            response.json(targetedDraft);

        })
    }
});

router.route("/users").get((req, res) => {
    console.log("getting all users");
    User.find()
        .then(users => res.json(users))
})





module.exports = router;
