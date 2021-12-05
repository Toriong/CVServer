const express = require('express');
const router = express.Router();
const User = require("../models/user");
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { promisify } = require('util');


// GOAL: if the current user is following the user that they want to block, delete that user from their following list  

// NOTES:
// do you need the msOfCurrentYear?

// CASE #2: userA is the first reply to userB's comment and the post is written by userB. Store a reply notification for userB
// the following is pushed into userB.notifications.replies: {postId, repliesInfo:[{commentAuthorId, commentsRepliedTo: [{id, replies: [{authorId, replies:[id of replies]}]
// the notifications.replies field is accessed 
// userB is found by using the notifyUserId
// the following is received from the front-end: {postId, repliesInfo:[{commentAuthorId, commentsRepliedTo: [{id, replies: [{authorId, replies:[id of replies]}]}
// the send the following: {postId, repliesInfo:[{commentAuthorId, commentsRepliedTo: [{id, replies: [{authorId, replies:[id of replies]}]}
// notifications.replies doesn't exist
// if notifications.replies doesn't exist, then send the following to the server: {postId, repliesInfo:[{commentAuthorId, commentsRepliedTo: [{id, replies: [{authorId, replies:[id of replies]}]}
// get notifications.replies of userB. 
// userA replies to userB's comment which is on userB's post.




const addUserCommentActivity = (userId, postId, res) => {
    User.updateOne(
        { _id: userId },
        {
            $addToSet:
            {
                'activities.comments': { postIdOfComment: postId }
            }
        },
        (error, numsAffected) => {
            if (error) {
                console.log('An error has occurred in updating the comment activity of user: ', error);
            } else {
                console.log(`User comment or reply will be tracked, numsAffected: `, numsAffected);
                res.send('Update was successful.');
            }
        }
    )
}

const addUserReplyActivity = (reqBody, res, isOnSamePost) => {
    const { userId } = reqBody;
    const { postId, commentId } = reqBody.data;
    if (isOnSamePost) {
        User.updateOne(
            { _id: userId },
            {
                $addToSet:
                {
                    "activities.replies.$[replyInfo].commentsRepliedTo": commentId
                }
            },
            {
                arrayFilters: [{ 'replyInfo.postId': postId }]
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('An error has occurred: ', error)
                    res.status(404).send('User reply is FAILED to be tracked.')
                } else {
                    console.log('user reply activity has been updated, numsAffected: ', numsAffected);
                    res.status(200).send('User reply is being tracked.')
                };
            }
        )
    } else {
        User.updateOne(
            { _id: userId },
            {
                $addToSet:
                {
                    "activities.replies": { postId: postId, commentsRepliedTo: [commentId] }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('An error has occurred: ', error)
                    res.status(404).send('User reply is FAILED to be tracked.')
                } else {
                    console.log('user reply activity has been updated, numsAffected: ', numsAffected);
                    res.status(200).send('User reply is being tracked.')
                };
            }
        )
    }
}


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
    const { data, name } = request.body;
    const { firstName, lastName, username, password, belief, sex, reasonsToJoin, email, phoneNum } = data;
    if (name === "newUser") {
        const newUser = new User({
            firstName,
            lastName,
            username,
            password,
            belief,
            sex,
            reasonsToJoin,
            email,
            phoneNum,
            isUserNew: true
        });
        console.log(newUser);
        response.json({
            status: "backend successfully received your request, user added to database",
        });
        newUser.save();
    };



})


router.route("/users/updateInfo").post((request, response) => {
    const { name, data, userId, username, listName, isPostPresent, isCommentAuthorPresent, notifyUserId } = request.body
    if (name === "addBioTagsAndSocialMedia") {
        console.log("updating user's account")
        const { topics, socialMedia } = data
        if (socialMedia) {
            User.updateOne(
                {
                    _id: userId
                },
                {
                    topics: topics,
                    socialMedia: socialMedia,
                    isUserNew: false
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                        response.json("User added social media and reading topics");
                    } else {
                        console.log("User added social media and reading topics. NumsAffected: ", numsAffected);
                    }
                }
            );
        } else {
            User.updateOne(
                {
                    _id: userId
                },
                {
                    topics: topics
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                        response.json("User added topics");
                    } else {
                        console.log("User added social media and reading topics. NumsAffected: ", numsAffected);
                    }
                }
            );
        }

        response.json({
            message: "backend successfully updated user's profile"
        });
        //     // updates only the title, subtitle, introPic, and the body of the user's draft
    } else if (name === "updateDraft") {
        const { draftId, field, userId, wasPicDeleted, imgUrl } = request.body;
        const { timeOfLastEdit, data: draftUpdate } = data;
        console.log("request.body: ", request.body);
        if (wasPicDeleted) {
            fs.unlink(`./postIntroPics/${imgUrl}`, err => {
                if (err) {
                    console.error("Failed to delete", err)
                } else {
                    console.log('image deleted.')
                }
            });
            User.updateOne(
                {
                    _id: userId,
                    "roughDrafts._id": draftId
                },
                {
                    $set:
                    {
                        "roughDrafts.$.timeOfLastEdit": timeOfLastEdit,
                    },
                    $unset:
                    {
                        "roughDrafts.$.imgUrl": ""
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("Error in deleting intro pic. Error message: ", error)
                    };
                    console.log("User deleted intro pic from draft, draft updated. NumsAffected: ", numsAffected);
                }
            );
        } else {
            User.updateOne(
                {
                    _id: userId,
                    "roughDrafts._id": draftId
                },
                {
                    $set:
                    {
                        [`roughDrafts.$.${field}`]: draftUpdate,
                        "roughDrafts.$.timeOfLastEdit": timeOfLastEdit
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                    } else {
                        console.log(`${field} was updated, numsAffected: `, numsAffected);
                    }
                }
            )
        };
        response.json({ message: field ? `${field} was updated.` : 'introPic was deleted' })
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
        const { draftId } = request.body;
        User.updateOne(
            { _id: userId },
            {
                $pull: { roughDrafts: { id: draftId } }
            },
            (error, data) => {
                if (error) {
                    console.error("error message: ", error);
                } else {
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
            const { _id: draftId, subtitle: subtitleFromClient, imgUrl: imgUrlFromClient, ...draftFromFrontEnd } = data;
            const drafts = user[0].roughDrafts;
            const draftInDB = drafts.find(({ _id: _draftId }) => _draftId === draftId);
            const { _id, defaultTitle, timeOfLastEdit, subtitle: subtitleInDb, imgUrl: imgUrlInDb, creation, ...draftInDB_ } = draftInDB;
            console.log({
                draftInDB_,
                draftFromFrontEnd
            })
            const isDraftSame = JSON.stringify(draftInDB_) === JSON.stringify(draftFromFrontEnd);
            const wasNoSubtitleChosen = (subtitleFromClient === undefined) && (subtitleInDb === '' || subtitleInDb === undefined)
            const isSubtitleSame = wasNoSubtitleChosen ? undefined : subtitleFromClient === subtitleInDb;
            const wasNoImageChosen = (imgUrlInDb === undefined) && (imgUrlFromClient === undefined);
            const isImgUrlSame = wasNoImageChosen ? undefined : imgUrlInDb === imgUrlFromClient;
            console.log({
                isDraftSame,
                wasNoImageChosen,
                isImgUrlSame,
                wasNoSubtitleChosen,
                isSubtitleSame,
            })
            if (isDraftSame && (((!wasNoImageChosen && isImgUrlSame) && (!wasNoSubtitleChosen && isSubtitleSame)) || (wasNoImageChosen && (!wasNoSubtitleChosen && isSubtitleSame)) || (wasNoImageChosen && wasNoSubtitleChosen) || ((!wasNoImageChosen && isImgUrlSame) && wasNoSubtitleChosen))) {
                console.log('pass')
                User.updateOne(
                    { _id: userId },
                    {
                        $pull: { roughDrafts: { _id: draftId } },
                        $push: { publishedDrafts: draftId }
                    },
                    (error, numsAffected) => {
                        if (error) console.error("Error in updating user.roughDrafts: ", error);
                        else {
                            console.log("User has been updated. numsAffected: ", numsAffected);
                            response.sendStatus(200)
                        }
                    }
                );
            } else {
                console.error('Draft check Failed!');
                response.sendStatus(404)
            }
        }).catch(error => {
            console.log("Query failed, message: ", error)
            response.sendStatus(400)
        })
    } else if (name === "userCommented") {
        const { userId } = request.body;
        const { postId } = data;
        console.log("tracking user activity")
        User.findOne({ _id: userId }, { _id: 0, "activities.comments": 1 }).then(results => {
            const commentsActivity_ = (results.activities && results.activities.comments && results.activities.comments.length) && results.activities.comments;
            if (commentsActivity_) {
                const { comments: commentsActivity } = results.activities;
                const didUserCommentOnPost = commentsActivity.map(({ postIdOfComment }) => postIdOfComment).includes(postId);
                if (didUserCommentOnPost) {
                    console.log('user already commented on this post.');
                } else {
                    // The user replied to comment on a post which the user has already replied to other comments as well. 
                    // push the following into activities.comments: {postId, commentsRepliedTo: [id of comment that the user replied to]}
                    addUserCommentActivity(userId, postId);
                }
            } else {
                addUserCommentActivity(userId, postId);
                console.log('First every comment.')
            }
        }, error => {
            console.error('An error has occurred in finding comment activity of user: ', error);
            res.sendStatus(404);
        });
    } else if (name === "userRepliedToComment") {
        const { commentId, postId } = data;
        User.findOne({ _id: userId }, { "activities.replies": 1, _id: 0 }).then(results => {
            const _repliesActivity = (results.activities && results.activities.replies && results.activities.replies.length) && results.activities.replies;
            if (_repliesActivity) {
                const targetPost = _repliesActivity.find(({ postId: _postId }) => _postId === postId);
                if (targetPost) {
                    console.log('sup')
                    const didRepliedToComment = targetPost.commentsRepliedTo.includes(commentId);
                    !didRepliedToComment ? addUserReplyActivity(request.body, response, true) : console.log('Replied to comment already.')
                } else {
                    console.log('beans')
                    addUserReplyActivity(request.body, response);
                }
            } else {
                console.log('hello');
                addUserReplyActivity(request.body, response);
            }
        })
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
                    // User.find(
                    //     { _id: userId },
                    //     { activities: 1, _id: 0 }
                    // ).then(results => {
                    //     console.log("results 483", results)
                    //     const { activities } = results[0]
                    //     response.json(activities);
                    // })
                    response.status(200).json({ isLiked: true })
                }
            }
        )
    } else if (name === 'userUnLikedPost') {
        const { userId } = request.body;
        const { postId } = data;
        User.updateOne(
            { _id: userId },
            {
                $pull:
                {
                    "activities.likes.likedPostIds": postId
                }
            },
            (error, numsAffected) => {
                if (error) throw error;
                else {
                    console.log(`User unliked a post, deleted activity. NumsAffectd: `, numsAffected);
                    // User.find(
                    //     { _id: userId },
                    //     { activities: 1, _id: 0 }
                    // ).then(results => {
                    //     console.log("results 483", results)
                    //     const { activities } = results[0]
                    //     response.json(activities);
                    // })
                    response.status(200).json({ isLiked: false })
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
                            const { activities } = results[0]
                            response.json(activities);
                        })
                    }
                }
            )
        }
    } else if (name === "userLikedReply") {
        const { signedInUserId: userId, isSamePost, isSameComment } = request.body
        const { replyId } = data;
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
                        // User.find(
                        //     { _id: userId },
                        //     { activities: 1, _id: 0 }
                        // ).then(results => {
                        //     const { activities } = results[0]
                        //     response.json(activities);
                        // })
                        response.sendStatus(200);
                    }
                }
            )
            // same post, but different comment
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
                        // User.find(
                        //     { _id: userId },
                        //     { activities: 1, _id: 0 }
                        // ).then(results => {
                        //     const { activities } = results[0]
                        //     response.json(activities);
                        // })
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
        console.log('data: ', data);
        const { newFollowingUserId, signedInUserId, followedUserAt } = data;
        console.log('dta ', data);
        User.updateOne({ _id: signedInUserId },
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
                    console.log(`New following added, numsAffected: `, numsAffected)
                }
            }
        );
        // IN DISPLAYING THE notifications, show the follower and the time of the follow
        User.updateOne({ _id: newFollowingUserId },
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
                    console.log(`User is being followed by ${signedInUserId}. `, numsAffected)
                    response.json({ newFollowingUserId, signedInUserId, wasDbUpdated: true });
                }
            }
        );
    } else if (name === "unFollowUser") {
        console.log('request.body: ', request.body);
        const { unFollowUser, signedInUserId: userId_ } = request.body;
        User.updateOne({ _id: userId_ },
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
                    console.log(`User unFollowed, numsAffected: `, numsAffected)
                }
            }
        );
        // how to tell if an element was seen on the UI?
        User.updateOne({ _id: unFollowUser },
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
                    console.log(`User was unFollowed. numsAffected: `, numsAffected)
                    response.json("User was unFollowed")
                }
            }
        );
    } else if (name === "saveIntoReadingList") {
        console.log('request.body: ', request.body);
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
        console.log('request.body: ', request.body);
        const { signedInUserId: userId, postId, listName: title } = request.body;
        User.updateOne(
            { _id: userId },
            {
                $pull:
                {
                    [`readingLists.${title}.list`]: { postId: postId }
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
    } else if (name === 'updateUserProfile') {
        const { iconPath, userId, field } = request.body
        if (iconPath) {
            fs.unlink(`./userIcons/${iconPath}`, err => {
                if (err) {
                    console.error("Failed to delete", err)
                } else {
                    response.json("old icon deleted")
                }
            });
        } else if (field === 'socialMedia' || field === 'topics') {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        [`${field}`]: data
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in updating social media info of user: ', error);
                    } else {
                        console.log(`${field} was updated`, numsAffected);
                        response.json(`${field} was successfully updated.`)
                    }
                }
            )
        } else if (!field) {
            let isError;
            console.log('data: ', data);
            data.forEach((val, index) => {
                const { field, data: newData } = val;
                User.updateOne(
                    { _id: userId },
                    {
                        $set:
                        {
                            [`${field}`]: newData
                        }
                    },
                    (error, numsAffected) => {
                        if (error) {
                            console.error('Error in updating profile info of user: ', error);
                            isError = true
                        };
                        console.log(`${field} updated, numsAffected: `, numsAffected)
                        if (((data.length - 1) === index) && isError) {
                            console.log('AN ERROR HAS OCCURRED.');
                            console.error(error)
                            response.sendStatus(404)
                        } else if (((data.length - 1) === index)) {
                            console.log('NO ERROR HAS OCCURRED.');
                            console.log('Update completed: ', numsAffected);
                            response.sendStatus(200);
                        };
                    }
                )
            });
        }
        // deleting the blocked user from the current user's followers list or just removing the user 
    } else if (name === "blockOrDelFollower") {
        const { deletedUser, isBlocked, blockedAt, isFollowing } = request.body;
        let wasError;
        let wasRemovedOnly;
        if (isBlocked && isFollowing) {
            console.log('user is being removed, blocked, and unFollowed.')
            User.updateOne(
                { _id: userId },
                {
                    $pull:
                    {
                        followers: { userId: deletedUser },
                        "activities.following": { userId: deletedUser }
                    },
                    $push:
                    {
                        blockedUsers: { userId: deletedUser, blockedAt }
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in deleting and blocking follower: ', error);
                        wasError = true;
                    } else {
                        console.log('User was deleted as a follower and blocked, numsAffected: ', numsAffected);
                    };
                }
            );
            User.updateOne(
                { _id: deletedUser },
                {
                    $pull:
                    {
                        followers: { userId: userId }
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in deleting following: ', error);
                        wasError = true;
                    } else {
                        console.log('Current use was deleted as a follower from the blocked and deleted user, numsAffected: ', numsAffected);
                    };
                }
            );
        } else if (isBlocked) {
            console.log('user is being removed and blocked.')
            User.updateOne(
                { _id: userId },
                {
                    $pull:
                    {
                        followers: { userId: deletedUser }
                    },
                    $push:
                    {
                        blockedUsers: { userId: deletedUser, blockedAt }
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in deleting and blocking follower: ', error);
                        wasError = true;
                    } else {
                        console.log('User was deleted as a follower and blocked, numsAffected: ', numsAffected);
                    };
                }
            );
        } else {
            console.log('user is being removed.')
            User.updateOne(
                { _id: userId },
                {
                    $pull:
                    {
                        followers: { userId: deletedUser }
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in deleting and blocking follower: ', error);
                        wasError = true;
                    } else {
                        console.log('User was deleted as a follower and blocked, numsAffected: ', numsAffected);
                        wasRemovedOnly = true;
                    };
                }
            );
        }
        User.updateOne(
            { _id: deletedUser },
            {
                $pull:
                {
                    "activities.following": { userId: userId }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting following: ', error);
                    wasError = true;
                    if (wasError) {
                        response.status(404).send('Something went wrong, please try again later.')
                    }
                } else {
                    console.log('Update was successful. User was deleted as a follower and blocked, numsAffected: ', numsAffected);
                    // response.json('User was deleted as a follower and blocked.')
                    response.json({
                        message: wasRemovedOnly ? 'User was removed as a follower.' : 'User was deleted as a follower and blocked.',
                        isBlocked: isBlocked,
                        isFollowing: isFollowing
                    })
                };
            }
        )
    } else if (name === 'unblockUser') {
        const { currentUserId, blockedUserId } = request.body;
        User.updateOne(
            { _id: currentUserId },
            {
                $pull:
                {
                    blockedUsers: { userId: blockedUserId }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting user from block list: ', error);
                    response.status(404).send('Something went wrong, please try again later.')
                } else {
                    console.log('Update was successful. User was deleted from block list, numsAffected: ', numsAffected);
                    response.json(' was removed from blocked list')
                };
            }
        )
    } else if (name === 'updateReadingListInfo') {
        const { editedListName, description, isPrivate } = data;
        if (description) {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        [`readingLists.${listName}.description`]: description
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in updating reading list of user');
                    } else {
                        console.log('Reading list has been updated, numsAffected: ', numsAffected);
                    }
                }
            );
        }
        if (isPrivate || (isPrivate === false)) {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        [`readingLists.${listName}.isPrivate`]: isPrivate
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in updating reading list of user has occurred: ', error);
                    } else {
                        console.log('Reading list has been updated, numsAffected: ', numsAffected);
                    }
                }
            );
        };
        if (editedListName) {
            User.updateOne(
                { _id: userId },
                {
                    $rename:
                    {
                        [`readingLists.${listName}`]: `readingLists.${editedListName}`
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in updating reading list of user has occurred: ', error);
                    } else {
                        console.log('Reading list has been updated, numsAffected: ', numsAffected);
                    }
                }
            );
        }
        response.status(200).send('List updated.');
    } else if (name === 'deleteReadingList') {
        User.updateOne(
            { _id: userId },
            {
                $unset:
                {
                    [`readingLists.${listName}`]: ''
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in updating reading list of user has occurred: ', error);
                } else {
                    console.log('Reading list has been updated, numsAffected: ', numsAffected);
                    response.status(200).send('List was deleted.');
                }
            }
        );
    } else if (name === 'replyNotification') {
        const { isCommentPresent, hasReplied } = request.body
        const { postId, commentId, replyId, replyAuthorId, commentAuthorId } = data;
        console.log('request.body: ', request.body);
        if (isPostPresent && isCommentAuthorPresent && isCommentPresent && hasReplied) {
            console.log('case 1')
            User.updateOne(
                { _id: notifyUserId },
                {
                    $push:
                    {
                        'notifications.replies.$[postOfReply].repliesInfo.$[commentAuthorId].commentsRepliedTo.$[commentId].replies.$[replyAuthorId].replyIds': { id: replyId, wasSeen: false }
                    }
                },
                {
                    arrayFilters: [{ 'postOfReply.postId': postId }, { 'commentAuthorId.commentAuthorId': commentAuthorId }, { 'commentId.id': commentId }, { 'replyAuthorId.authorId': replyAuthorId }],
                    multi: true
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('An error has occurred in notifying user: ', error);
                    } else {
                        console.log('User was notified. Case 1 was implemented. ', numsAffected);
                    }
                }
            )
        } else if (isPostPresent && isCommentAuthorPresent && isCommentPresent && !hasReplied) {
            console.log('case 2')
            // the user has replied to the same author on the same post but to a different comment 
            // GOAL: push the following into the 'replies' field: {authorId: the author id of the reply, replyIds: [{id: replyId, wasSeen: false}]}
            User.updateOne(
                { _id: notifyUserId },
                {
                    $push:
                    {
                        'notifications.replies.$[postOfReply].repliesInfo.$[commentAuthorId].commentsRepliedTo.$[commentId].replies': { authorId: replyAuthorId, replyIds: [{ id: replyId, wasSeen: false }] }
                    }
                },
                {
                    arrayFilters: [{ 'postOfReply.postId': postId }, { 'commentAuthorId.commentAuthorId': commentAuthorId }, { 'commentId.id': commentId }],
                    multi: true
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('An error has occurred in notifying user: ', error);
                    } else {
                        console.log('User was notified. Case 2 was implemented, numsAffected: ', numsAffected);
                    }
                }
            )
        } else if (isPostPresent && isCommentAuthorPresent && !isCommentPresent && !hasReplied) {
            console.log('case 3')
            // the current user has replied to the same author on the same post, but to a different comment 
            // GOAL: push the following into commentsRepliedTo: {id: commentId, replies: [{authorId: replyAuthorId, replyIds: [{id: replyId, wasSeen: false}]}]}
            User.updateOne(
                { _id: notifyUserId },
                {
                    $push:
                    {
                        'notifications.replies.$[postOfReply].repliesInfo.$[commentAuthorId].commentsRepliedTo': { id: commentId, replies: [{ authorId: replyAuthorId, replyIds: [{ id: replyId, wasSeen: false }] }] }
                    }
                },
                {
                    arrayFilters: [{ 'postOfReply.postId': postId }, { 'commentAuthorId.commentAuthorId': commentAuthorId }],
                    multi: true
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('An error has occurred in notifying user: ', error);
                    } else {
                        console.log('User was notified. Case 3 was implemented, numsAffected: ', numsAffected);
                    }
                }
            )
            // CASE 4
        } else if (isPostPresent && !isCommentAuthorPresent && !isCommentPresent && !hasReplied) {
            console.log('case 4')
            // the user has replied on the post before, but in this case, this is the first time that the current user has replied to this comment and author of the comment  
            User.updateOne(
                { _id: notifyUserId },
                {
                    $push:
                    {
                        'notifications.replies.$[postOfReply].repliesInfo': { commentAuthorId: commentAuthorId, commentsRepliedTo: [{ id: commentId, replies: [{ authorId: replyAuthorId, replyIds: [{ id: replyId, wasSeen: false }] }] }] }
                    }
                },
                {
                    arrayFilters: [{ 'postOfReply.postId': postId }],
                    multi: true
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('An error has occurred in notifying user: ', error);
                    } else {
                        console.log('User was notified. Case 3 was implemented, numsAffected: ', numsAffected);
                    }
                }
            )
        } else if (!isPostPresent && !isCommentAuthorPresent && !isCommentPresent && !hasReplied) {
            console.log("case 5");
            User.updateOne(
                { _id: notifyUserId },
                {
                    $push:
                    {
                        "notifications.replies": { postId, repliesInfo: [{ commentAuthorId: commentAuthorId, commentsRepliedTo: [{ id: commentId, replies: [{ authorId: replyAuthorId, replyIds: [{ id: replyId, wasSeen: false }] }] }] }] }
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in notifying user, case 5: ', error);
                    } else {
                        console.log('User was notified of new reply. Case 5 was implemented, numsAffected: ', numsAffected);
                    }
                }
            )
        }
        response.json('Update was successful. User was notified.')
    } else if (name === 'commentNotifications') {
        const { postId, commentId, commentAuthorId } = data;
        // MAIN GOAL: when the current user leaves a comment on a post, notify the following users:
        // all users who left a comment on the post if at least one of them isn't the current user 
        // the author of the post, if the author of the post isn't the current user

        // CASES: 
        // CASE 1: if postPresent and commentAuthorPresent, then find the comment author and push the new comment notification for that author
        // CASE 2: if postPresent and !commentAuthorPresent, then find the post in the notifications.comments and push the following into the commentsInfo field: {commentAuthorId: current user id goes here, commentIds: [{id: commentId, wasSeen: false}]} 
        // CASE 3: if !postPresent and !commentAuthorPresent, then push the following into notifications.comments: {postId, commentsInfo: [{commentAuthorId, commentIds: [{id: commentId, wasSeen: false}]}]}
        console.log('request.body: ', request.body);
        if (isPostPresent && isCommentAuthorPresent) {

        } else if (isPostPresent && !isCommentAuthorPresent) {

        } else {
            // User.updateOne(
            //     { _id: notifyUserId },
            //     {
            //         $push:
            //         {
            //             "notifications.comments": { postId, commentsInfo: [{ commentAuthorId: commentAuthorId, commentIds: [{ id: commentId, wasSeen: false}] }] }
            //         }
            //     },
            //     (error, numsAffected) => {
            //         if (error) {
            //             console.error('Error in notifying user of a new comment, case 3: ', error);
            //         } else {
            //             console.log('User was notified of new comment. Case 3 was implemented, numsAffected: ', numsAffected);
            //         }
            //     }
            // )
        }
    };
}, (error, req, res, next) => {
    if (error) {
        res.status(404).send('An error has occurred. Please try again later.');
    };
});



const userIconStorage = multer.diskStorage({
    destination: 'userIcons',
    filename: (req, file, cb) => {
        cb(null, req.body.userId + path.extname(file.originalname))
    }
});

const userIconUpload = multer({
    storage: userIconStorage,
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        cb(null, true)
    }
});

router.route('/users/updateUserIcon').post(userIconUpload.single('file'), (req, res) => {
    const { bio, userId, name } = req.body;
    if (bio) {
        User.updateOne(
            { _id: userId },
            {
                $set:
                {
                    bio: bio,
                    iconPath: userId + path.extname(req.file.originalname)
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.log("Error in updating bio. Error message: ", error)
                };
                console.log("Bio updated, numsAffected: ", numsAffected);
            }
        )
    } else {
        User.updateOne(
            { _id: userId },
            {
                $set:
                {
                    iconPath: userId + path.extname(req.file.originalname)
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.log("Error in updating bio. Error message: ", error)
                } else {
                    console.log("Bio updated, numsAffected: ", numsAffected);
                }
            }
        )
    };
    res.status(200).json({ message: 'Image upload successful!', iconPath: userId + path.extname(req.file.originalname) });
}, (error, req, res, next) => {
    const { status } = res;
    if (status === 400 || error) {
        console.error("ERROR! Can't upload image: ", error);
        console.log("error.code: ", error.code);
        if (error.code === 'LIMIT_FILE_SIZE') {
            res.status(413).send('Image is too large. Please choose a smaller image and try again.')
        };
    }
});

const postIntroPicStorage = multer.diskStorage({
    destination: 'postIntroPics',
    filename: (req, file, cb) => {
        console.log('loading file');
        const { userId, postId, timeOfLastEdit } = req.body;
        const timeOfLastEdit_ = JSON.parse(timeOfLastEdit);
        cb(null, timeOfLastEdit_.miliSeconds + '_' + userId + '_' + postId + path.extname(file.originalname))
    }
});

const postIntroPicUpload = multer({
    storage: postIntroPicStorage,
    limits: {
        fileSize: 100_000_000
    },
    fileFilter(req, file, cb) {
        cb(null, true);
    }
});

router.route('/users/updateDraft').post(postIntroPicUpload.single('file'), (req, res) => {
    console.log("req.body: ", req.body);
    const extname = path.extname(req.file.originalname);
    const { postId, userId, timeOfLastEdit } = req.body;
    const timeOfLastEdit_ = JSON.parse(timeOfLastEdit);
    console.log({ timeOfLastEdit_ });
    const introPicUrl = timeOfLastEdit_.miliSeconds + '_' + userId + '_' + postId + extname;
    User.updateOne(
        {
            _id: userId,
            "roughDrafts._id": postId
        },
        {
            $set: {
                "roughDrafts.$.timeOfLastEdit": timeOfLastEdit_,
                "roughDrafts.$.imgUrl": introPicUrl
            }
        },
        (error, numsAffected) => {
            if (error) {
                console.error("error message: ", error);
            }
            console.log("Non-intro pic update. NumsAffected: ", numsAffected);
            res.status(200).json({ imgUrl: introPicUrl });
        }
    )
}, (error, req, res, next) => {
    const { status } = res;
    if (status === 400 && error) {
        console.error("Error message: ", error);
        res.json({ message: "An error has occurred. Your image may be too large. Please try again and upload a different image." })
    };

    console.log('Request completed')
});






router.route("/users/:package").get((request, response) => {
    const package = JSON.parse(request.params.package);
    const { password: passwordAttempt, name, userId, username } = package;
    console.log('username: ', username);
    if (name === "signInAttempt") {
        console.log("user wants to sign in")
        User.find({ username: username }).then(user => {
            if ((user[0] && user[0].password) === passwordAttempt) {
                const { username, firstName, lastName, iconPath, _id, readingLists, topics, activities, isUserNew, bio, socialMedia, blockedUsers, publishedDrafts } = user[0];
                console.log('password matches user signed backed in.')
                console.log("user signed back in")
                const defaultUserInfo = { username, firstName, lastName, iconPath, _id, isUserNew, bio };
                let user_;
                if (activities) {
                    user_ = { activities: activities }
                }
                if (readingLists && Object.keys(readingLists).length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, readingLists } : { readingLists }
                }
                if (topics && topics.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, topics } : { topics }
                };
                if (socialMedia && socialMedia.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, socialMedia } : { socialMedia }
                }
                if (blockedUsers && blockedUsers.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, blockedUsers } : { blockedUsers }
                }
                if (publishedDrafts && publishedDrafts.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, publishedDrafts } : { publishedDrafts }
                }
                response.json({
                    message: `Welcome back ${username}!`,
                    user: user_ ? { ...user_, ...defaultUserInfo } : defaultUserInfo
                });
            } else {
                console.error("Sign-in attempt FAILED");
                response.status(401).send('Invalid username or password.');
            }
        }).catch(error => {
            if (error) {
                console.error("error message: ", error);
                response.status(404).send({ message: 'Something went wrong. Please try again later.' });
            }
        });
        console.log("wtf yo")
    } else if (name === "getRoughDrafts") {
        User.findById(userId).then(user_ => {
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
        User.find({ _id: userId }).then(user => {
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
            const following = (user.activities && user.activities.following && user.activities.following.length) && user.activities.following.map(({ userId }) => userId);
            const topics = (user && user.topics) && user.topics;
            const readingLists = user.readingLists && user.readingLists;
            let _package;
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
            if (_package) {
                response.json({ _package })
            } else {
                response.json("no topics, following, nor reading list items are present")
            }
        })
    } else if (name === 'getTargetDraft') {
        const { draftId } = package;
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
    } else if ((name === 'getUserId') && username) {
        console.log('username: ', username);
        User.find({ username: username }).then(user => {
            console.log('user: ', user);
            const { _id } = user[0];
            response.json({
                _id
            })
        })
    } else if (name === 'getAllUsers') {
        console.log('getting all users')
        User.find({}).then(users => {
            response.json(
                users
            )
        }).catch(err => {
            console.log(`Error in getting all users, line 960: ${err}`)
        })
    } else if (name === 'getFollowers') {
        User.find(
            { _id: userId },
            { followers: 1, _id: 0 }
        )
            .then(result => {
                if (result.length && result[0].followers && result[0].followers.length) {
                    response.json({ followers: result[0].followers })
                }
            })
            .catch(error => {
                if (error) {
                    console.error("ERROR in finding user's account and followers: ", error)
                }
            })
    } else if (name === 'checkIfUserNameWasTaken') {
        console.log('checking if username was taken...')
        User.find({ username: username, _id: { $ne: userId } }).countDocuments().then(results => {
            console.log("results: ", results);
            if (results > 0) {
                // username was taken
                console.log('username was taken')
                response.status(406).send(true)
            } else {
                // username wasn't taken
                console.log('username was not taken')
                response.status(200).send(false)
            }
        });
    } else if (name === 'checkBlockStatus') {
        const { authorId, currentUserId } = package;
        User.find({ _id: authorId }, { blockedUsers: 1, _id: 0 }).then(results => {
            let isBlocked = false;
            if (results[0] && results[0].blockedUsers && results[0].blockedUsers.length) {
                isBlocked = results[0].blockedUsers.map(({ userId }) => userId).includes(currentUserId);
            };
            response.json({ isBlocked });
        }).catch(error => { error && console.error('Error in finding user and checking block status: ', error) })
    } else if (name === 'checkListName') {
        console.log('checking if list name was taken');
        const { listName } = package;
        console.log('listName: ', listName);
        User.findOne({ _id: userId }, { [`readingLists.${listName}`]: 1, _id: 0 }).then(result => {
            const isListNameTaken = Object.keys(result.readingLists).length
            if (isListNameTaken) {
                // list name was taken
                console.log('list name was taken');
                response.status(406)
            } else {
                // list name wasn't taken
                console.log('list name was not taken')
                response.status(200)
            }

        }).catch(error => {
            if (error) {
                console.log(error)
                response.status(500);
            }
        })
    } else if (name === 'getReplyNotifications') {
        const { userIds } = package;
        User.find({ _id: { $in: userIds } }, { ["notifications.replies"]: 1, _id: 1 })
            .then(replies => {
                // let replies = results.length > 1 ? results : results[0].notifications.replies;
                console.log('replies: ', replies);
                let _replies;
                if (replies.length) {
                    _replies = replies.map(reply => {
                        const { notifications, _id: userId } = reply;
                        const replies = (notifications && notifications.replies && notifications.replies.length) && notifications.replies;

                        return replies ? { userId: userId, replies } : { userId: userId };
                    })
                };
                response.status(200).send(_replies);
            })
            .catch(error => {
                if (error) {
                    console.log(error)
                    response.sendStatus(500);
                }
            })
    } else if (name === 'getCommentNotifications') {
        const { userIds } = package;
        User.find({ _id: { $in: userIds } }, { ["notifications.comments"]: 1, _id: 1 })
            .then(comments => {
                const comments_ = comments.map(reply => {
                    const { notifications, _id: userId } = reply;
                    const comments = (notifications && notifications.comments && notifications.comments.length) && notifications.comments;
                    return comments ? { userId: userId, comments } : { userId: userId };
                })
                response.status(200).send(comments_);
            })
            .catch(error => {
                if (error) {
                    console.error("An error has occurred in getting user notifications for comments: ", error)
                }
            });
    } else if (name === 'getUserCommentActivities') {
        User.find({ _id: userId }, { ["activities.comments"]: 1, _id: 0 })
            .then(commentsActivity => {
                const _commentsActivity = (commentsActivity[0].activities && commentsActivity[0].activities.comments && commentsActivity[0].activities.comments.length) ? commentsActivity[0].activities.comments : null;
                response.json(_commentsActivity);
            })
            .catch(error => {
                if (error) {
                    console.error("An error has occurred in getting user notifications for comments: ", error)
                }
            });
    } else if (name === 'getReplyActivities') {
        User.find({ _id: userId }, { ["activities.replies"]: 1, _id: 0 })
            .then(replyActivities => {
                const _replyActivities = (replyActivities[0].activities && replyActivities[0].activities.replies && replyActivities[0].activities.replies.length) ? replyActivities[0].activities.replies : null;
                console.log('_replyActivities', _replyActivities);
                response.json(_replyActivities);
            })
            .catch(error => {
                if (error) {
                    console.error("An error has occurred in getting user notifications for comments: ", error)
                }
            });
    }
})

router.route("/users").get((req, res) => {
    console.log("getting all users");
    User.find({}, { __v: 0, password: 0, phoneNum: 0, publishedDrafts: 0, belief: 0, email: 0, topics: 0, reasonsToJoin: 0, sex: 0, notifications: 0, roughDrafts: 0, socialMedia: 0 })
        .then(users => {
            res.json(users)
        })
        .catch(err => {
            console.log(`Error in getting all users, line 972: ${err}`)
        })
})





module.exports = router;
