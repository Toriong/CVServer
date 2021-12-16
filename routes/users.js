
const express = require('express');
const multer = require('multer');
const User = require("../models/user");
const BlogPost = require('../models/blogPost');
const fs = require('fs');
const timeFns = require("../functions/getTime");
const { getTime, computeTimeElapsed, getTimeElapsedText, getTimeElapsedInfo } = timeFns;
const router = express.Router();
const path = require('path');
const { delNonexistentReplies, delNonexistentReplyAuthors, delNonexistentCommAuthors, delNonexistentComms, delNonexistentPosts } = require('../functions/delNonexistentValues');
const addNotificationToDel = require('../functions/addNotificationsToDel');


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


// GOAL: CHECK IF THE CURRENT USER LIKED THE REPLY BEFORE 
// don't do anything
// the current user liked the reply before
// accessing the likedReplyIds, check if the current user liked the reply before, then don't do anything
// the likedReplyIds is accessed
// the comment id exist
// if the comment id exist, then access the likedReplyIds field
// the repliedToComments field is accessed
// the current post exist
// if the current post exist, then access the repliedToComments

const _getTimeElapsedText = eventTime => {
    const { miliSeconds: currentTimeInMS, msOfCurrentYear } = getTime();
    const timeSinceReply = currentTimeInMS - eventTime.miliSeconds;
    const { minutes, hours, days, months, years } = computeTimeElapsed(timeSinceReply, msOfCurrentYear);
    return getTimeElapsedText(minutes, hours, days, months, years);
}

const addPostNotification = (notifyUserId, newPostLikeNotification) => {
    User.updateOne(
        { _id: notifyUserId },
        {
            $addToSet:
            {
                'notifications.likes.posts': newPostLikeNotification
            }
        },
        (error, numsAffected) => {
            if (error) {
                console.error('Case 2 or 3. An error has occurred in notifying author of comment of new like: ', error);
            } else {
                console.log('Case 2 or 3. Post like notification was sent, numsAffected: ', numsAffected);
            }
        }
    )
}


const addCommentNotification = (notifyUserId, newCommentNotification) => {
    User.updateOne(
        { _id: notifyUserId },
        {
            $addToSet:
            {
                'notifications.likes.comments': newCommentNotification
            }
        },
        (error, numsAffected) => {
            if (error) {
                console.error('An error has occurred in notifying author of comment of new like ', error);
            } else {
                console.log('Comment notification for author of comment was sent, numsAffected: ', numsAffected);
            }
        }
    );
}

const checkLikesInfo = (data, likesNotifications, type = {}) => {
    const { postId, commentId: _commentId, replyId } = data;
    console.log('replyId: ', replyId);
    const { isComment, isReply } = type;
    let isPostPresent;
    let isCommentPresent;
    let isReplyPresent;

    likesNotifications.forEach(like => {
        const { postId: _postId, commentsRepliedTo, comments: comments_ } = like;
        const comments = commentsRepliedTo ?? comments_
        if (_postId === postId) {
            isPostPresent = true;
            (isComment || isReply) && comments.forEach(({ commentId, replies }) => {
                if (commentId === _commentId) {
                    isCommentPresent = true;
                    console.log('replies: ', replies);
                    isReply && replies.forEach(({ replyId: _replyId }) => {
                        if (replyId === _replyId) {
                            isReplyPresent = true;
                        }
                    })
                }
            })
        }
    });

    return { isPostPresent, isCommentPresent, isReplyPresent };
}

const notifyUserOfNewReplyLike = (notifyUserId, newReplyLikeNotification) => {
    User.updateOne(
        { _id: notifyUserId },
        {
            $addToSet:
            {
                'notifications.likes.replies': newReplyLikeNotification
            }
        },
        (error, numsAffected) => {
            if (error) {
                console.error('An error has occurred in notifying author of reply of new like: ', error);
            } else {
                console.log('Case 4 or 5. User was notified of reply like, numsAffected: ', numsAffected);
            }
        }
    );
}

const checkWasCommentLiked = (commentLikesInfo, data) => {
    const { postId, commentId } = data;
    let isPostPresent;
    let isCommentLiked;

    commentLikesInfo && commentLikesInfo.forEach(({ postIdOfComment, likedCommentIds }) => {
        if (postIdOfComment === postId) {
            isPostPresent = true;
            isCommentLiked = likedCommentIds.includes(commentId);
        }
    });

    return { isPostPresent, isCommentLiked };
}

const checkWasReplyLiked = (replyLikesInfo, data) => {
    const { postId, commentId, replyId } = data;
    let isPostPresent;
    let isCommentPresent;
    let wasReplyLiked;

    replyLikesInfo && replyLikesInfo.forEach(({ postIdOfReply, repliedToComments }) => {
        if (postIdOfReply === postId) {
            isPostPresent = true;
            repliedToComments.forEach(({ id: _commentId, likedReplyIds }) => {
                if (commentId === _commentId) {
                    isCommentPresent = true;
                    wasReplyLiked = likedReplyIds.includes(replyId);
                }
            })
        }
    });

    return { isPostPresent, isCommentPresent, wasReplyLiked };
}

const checkForCurrentUserReply = (replyNotifications, data) => {
    const { postId, commentId, replyAuthorId, commentAuthorId: commentUserId } = data;
    let isPostPresent;
    let isCommentAuthorPresent;
    let isCommentPresent;
    let hasReplied;
    replyNotifications && replyNotifications.forEach(({ postId: _postId, repliesInfo }) => {
        // check if the user has left a reply on this post before
        if (postId === _postId) {
            isPostPresent = true;
            repliesInfo.forEach(({ commentAuthorId, commentsRepliedTo }) => {
                // check if the user has replied to this comment author before
                if (commentAuthorId === commentUserId) {
                    isCommentAuthorPresent = true
                    commentsRepliedTo.forEach(({ id: _commentId, replies }) => {
                        // check if the user has replied to this comment before
                        if (_commentId === commentId) {
                            isCommentPresent = true
                            replies.forEach(({ authorId }) => {
                                // check if the current user has already replied to the target comment
                                if (authorId === replyAuthorId) {
                                    hasReplied = true;
                                }
                            })
                        }
                    })
                }
            })
        };
    });

    return { isPostPresent, isCommentAuthorPresent, isCommentPresent, hasReplied };
};

// GOAL: check if the current user has already commented on the post and if the current user id is already present in the target post. If so, then push the id of the comment for the target user.

// 
const checkForCurrentUserComment = (commentNotifications, currentUserId, postId) => {
    let isPostPresent;
    let hasCommented;
    commentNotifications && commentNotifications.forEach(({ postId: _postId, comments }) => {
        if (postId === _postId) {
            isPostPresent = true;
            comments.forEach(({ authorId }) => {
                if (authorId === currentUserId) {
                    hasCommented = true;
                }
            })
        }
    });

    return { isPostPresent, hasCommented };
}


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
};

const notifyUserOfNewReply = (newReply, notifyUserId) => {
    User.updateOne(
        { _id: notifyUserId },
        {
            $push:
            {
                "notifications.replies": newReply
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
                    addUserCommentActivity(userId, postId, response);
                }
            } else {
                addUserCommentActivity(userId, postId, response);
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
        console.log("request.body", request.body);
        const { userId } = request.body;
        const { postId } = data;
        User.findOne({ _id: userId }, { 'activities.likes.likedPostIds': 1, _id: 0 }).then(result => {
            const likedPostsActivities = (result.activities && result.activities.likes && result.activities.likes.likedPostIds && result.activities.likes.likedPostIds.length) && result.activities.likes.likedPostIds;
            const wasPostLiked = likedPostsActivities && likedPostsActivities.includes(postId);
            if (likedPostsActivities && wasPostLiked) {
                console.log('User liked post already.');
            } else {
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
                            console.log(`User liked post is being tracked, numsAffected: `, numsAffected);
                        }
                    }
                )
            }
        })
        response.status(200).json('Liked post is being tracked.')
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
                    response.status(200).json({ isLiked: false })
                }
            }
        )
    } else if (name === "userLikedComment") {
        const { postId, commentId } = data;
        User.findOne({ _id: userId }, { "activities.likes.comments": 1, _id: 0 }).then(result => {
            console.log("result: ", result);
            const likedCommentsActivity = (result.activities && result.activities.likes && result.activities.likes.comments && result.activities.likes.comments.length) && result.activities.likes.comments
            const { isPostPresent, isCommentLiked } = checkWasCommentLiked(likedCommentsActivity, data);
            if (isPostPresent && isCommentLiked) {
                console.log('The user has liked the comment before.');
            } else if (isPostPresent && !isCommentLiked) {
                console.log('case 1 comment activity')
                // find the object that contains the current post id and push the new liked comment into the likedCommentIds 
                User.updateOne(
                    { _id: userId },
                    {
                        $addToSet:
                        {
                            'activities.likes.comments.$[commentInfo].likedCommentIds': commentId
                        }
                    },
                    {
                        arrayFilters: [{ 'commentInfo.postIdOfComment': postId }]
                    },
                    (error, numsAffected) => {
                        if (error) console.error('An error has occurred in tracking liked comment: ', error);
                        else {
                            console.log(`User liked a comment, numsAffected: `, numsAffected);
                        }
                    }
                )
            } else {
                console.log('case 2 comment activity')
                // push the following into activities.likes.comments: {postIdOfComment, likedCommentIds: [id of liked comments]}
                const newCommentLikeActivity = {
                    postIdOfComment: postId,
                    likedCommentIds: [commentId]
                }
                User.updateOne(
                    { _id: userId },
                    {
                        $addToSet:
                        {
                            'activities.likes.comments': newCommentLikeActivity
                        }
                    },
                    (error, numsAffected) => {
                        if (error) console.error('An error has occurred in tracking liked comment: ', error);
                        else {
                            console.log(`User liked a comment, numsAffected: `, numsAffected);
                        }
                    }
                )
            };
            response.status(200).json('Comment like is being tracked');
        });

        // CASE #1: user likes a comment on a post where the user has liked other comments before


        // CASE #2: this is the first comment that the user liked on the current post

    } else if (name === "userLikedReply") {
        const { replyId, commentId, postId } = data;

        User.findOne({ _id: userId }, { _id: 0, 'activities.likes.replies': 1 }).then(result => {
            const replyActivities = (result.activities.likes && result.activities.likes.replies && result.activities.likes.replies.length) && result.activities.likes.replies;
            const { isPostPresent, isCommentPresent, wasReplyLiked } = checkWasReplyLiked(replyActivities, data);
            if (isPostPresent && isCommentPresent && wasReplyLiked) {
                console.log('User liked the reply already.');
            } else if (isPostPresent && isCommentPresent && !wasReplyLiked) {
                console.log('case 1')
                // find the post id, access the repliedToComments field, find the comment of the reply that was liked, push the new liked reply id into the field of likedReplyIds
                User.updateOne(
                    { _id: userId },
                    {
                        $addToSet:
                        {
                            "activities.likes.replies.$[post].repliedToComments.$[comment].likedReplyIds": replyId
                        }
                    },
                    {
                        arrayFilters: [{ 'post.postIdOfReply': postId }, { 'comment.id': commentId }]
                    },
                    (error, numsAffect) => {
                        if (error) {
                            console.error(`Error in tracking user liked reply: `, error);
                        } else {
                            console.log("user liked reply on new post. Case 1 was implemented, numsAffected: ", numsAffect);
                        }
                    }
                )
            } else if (isPostPresent && !isCommentPresent && !wasReplyLiked) {
                console.log('case 2')
                // find the postId, and push the following into repliedToComments: {commentId, likedReplyIds: [id of reply that was liked]}
                const newLikedReplyActivity = {
                    id: commentId,
                    likedReplyIds: [replyId]
                };
                User.updateOne(
                    { _id: userId },
                    {
                        $addToSet:
                        {
                            "activities.likes.replies.$[post].repliedToComments": newLikedReplyActivity
                        }
                    },
                    {
                        arrayFilters: [{ 'post.postIdOfReply': postId }]
                    },
                    (error, numsAffect) => {
                        if (error) {
                            console.error(`Error in tracking user liked reply: `, error);
                        } else {
                            console.log("user liked reply on new post. Case 2 was implemented, numsAffected: ", numsAffect);
                        }
                    }
                )
            } else {
                console.log('case 3')
                // implement the last case in the code below
                const newLikedReplyActivity = {
                    postIdOfReply: postId,
                    repliedToComments: [{ id: commentId, likedReplyIds: [replyId] }]
                }
                User.updateOne(
                    { _id: userId },
                    {
                        $addToSet:
                        {
                            "activities.likes.replies": newLikedReplyActivity
                        }
                    },
                    (error, numsAffect) => {
                        if (error) {
                            console.error(`Error in tracking user liked reply: `, error);
                        } else {
                            console.log("user liked reply on new post. Case 3 was implemented, numsAffected: ", numsAffect);
                        }
                    }
                )
            }
        });
        response.json('Will track user reply like');
    } else if (name === "followUser") {
        // NOTIFY THE USER BEING FOLLOWED HERE
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
                    'notifications.newFollowers': { userId: signedInUserId, isMarkedRead: false }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error(`Error message 687: ${error}`)
                } else {
                    console.log(`User is being followed by ${signedInUserId}. `, numsAffected)
                    response.json('user has a new follower and is notified');
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
                    console.log(`Following activity deleted, numsAffected: `, numsAffected)
                }
            }
        );
        // NOT WORKING:
        console.log('userId_: ', userId_);
        User.updateOne({ _id: unFollowUser },
            {
                $pull:
                {
                    followers: { userId: userId_ },
                    'notifications.newFollowers': { userId: userId_ }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error(`Error message 687: ${error}`)
                } else {
                    console.log(`User was unFollowed. numsAffected: `, numsAffected)
                    response.json("User was unFollowed and new following notification was deleted.")
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
    } else if (name === 'replyNotifications') {
        const { userIds } = request.body
        const { postId, commentId, replyId, replyAuthorId, commentAuthorId } = data;
        console.log('request.body: ', request.body);
        const newReplyNotification = { postId, repliesInfo: [{ commentAuthorId: commentAuthorId, commentsRepliedTo: [{ id: commentId, replies: [{ authorId: replyAuthorId, replyIds: [{ id: replyId, isMarkedRead: false }] }] }] }] };
        User.find(
            { _id: { $in: userIds } },
            { ["notifications.replies"]: 1, _id: 1 },
            error => {
                if (error) console.error("An ERROR has occurred in finding reply notifications of user: ", error);
                else {
                    console.log('No errors has occurred, notifying users.');
                    response.json('No errors has occurred, notifying users.');
                }
            }).then(replyNotifications => {
                const userReplyNotifications = replyNotifications.map(reply => {
                    const { notifications, _id } = reply;
                    const replyNotifications_ = (notifications && notifications.replies && notifications.replies.length) && notifications.replies;

                    return replyNotifications_ ? { notifyUserId: _id, replyNotifications: replyNotifications_ } : { notifyUserId: _id };
                });

                userReplyNotifications.forEach(({ notifyUserId, replyNotifications }) => {
                    // GOAL: check for the following: isCommentPresent, hasReplied, isPostPresent
                    if (replyNotifications) {
                        const { isPostPresent, isCommentAuthorPresent, isCommentPresent, hasReplied } = checkForCurrentUserReply(replyNotifications, data);
                        if (isPostPresent && isCommentAuthorPresent && isCommentPresent && hasReplied) {
                            console.log('case 1')
                            User.updateOne(
                                { _id: notifyUserId },
                                {
                                    $push:
                                    {
                                        'notifications.replies.$[postOfReply].repliesInfo.$[commentAuthorId].commentsRepliedTo.$[commentId].replies.$[replyAuthorId].replyIds': { id: replyId, isMarkedRead: false }
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
                            User.updateOne(
                                { _id: notifyUserId },
                                {
                                    $push:
                                    {
                                        'notifications.replies.$[postOfReply].repliesInfo.$[commentAuthorId].commentsRepliedTo.$[commentId].replies': { authorId: replyAuthorId, replyIds: [{ id: replyId, isMarkedRead: false }] }
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
                            User.updateOne(
                                { _id: notifyUserId },
                                {
                                    $push:
                                    {
                                        'notifications.replies.$[postOfReply].repliesInfo.$[commentAuthorId].commentsRepliedTo': { id: commentId, replies: [{ authorId: replyAuthorId, replyIds: [{ id: replyId, isMarkedRead: false }] }] }
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
                        } else if (isPostPresent && !isCommentAuthorPresent && !isCommentPresent && !hasReplied) {
                            console.log('case 4')
                            User.updateOne(
                                { _id: notifyUserId },
                                {
                                    $push:
                                    {
                                        'notifications.replies.$[postOfReply].repliesInfo': { commentAuthorId: commentAuthorId, commentsRepliedTo: [{ id: commentId, replies: [{ authorId: replyAuthorId, replyIds: [{ id: replyId, isMarkedRead: false }] }] }] }
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
                                        console.log('User was notified. Case 4 was implemented, numsAffected: ', numsAffected);
                                    }
                                }
                            )
                        } else {
                            console.log("case 5");
                            notifyUserOfNewReply(newReplyNotification, notifyUserId);
                        }
                    } else {
                        console.log("case 5, ribeye");
                        notifyUserOfNewReply(newReplyNotification, notifyUserId);
                    }
                })
            })
    } else if (name === 'commentNotifications') {
        console.log("request.body: ", request.body)
        const { userIds } = request.body;
        const { postId, commentId } = data;
        // const isOneUserId = userIds.constructor !== Array;
        // MAIN GOAL: when the current user leaves a comment on a post, notify the following users:
        // all users who left a comment on the post if at least one of them isn't the current user 
        // the author of the post, if the author of the post isn't the current user

        // CASES: 
        // CASE 1: if postPresent and commentAuthorPresent, then find the comment author and push the new comment notification for that author
        // CASE 2: if postPresent and !commentAuthorPresent, then find the post in the notifications.comments and push the following into the commentsInfo field: {commentAuthorId: current user id goes here, commentIds: [{id: commentId, isMarkedRead: false}]} 
        // CASE 3: if !postPresent and !commentAuthorPresent, then push the following into notifications.comments: {postId, commentsIxxnfo: [{commentAuthorId, commentIds: [{id: commentId, isMarkedRead: false}]}]}
        User.find(
            { _id: { $in: userIds } },
            { 'notifications.comments': 1, _id: 1 },
            error => {
                if (error) {
                    console.error("An error has occurred in getting comment notifications of users: ", error);
                    response.sendStatus(404);
                } else {
                    console.log('No error has occurred in getting comment notifications of user');
                    response.json('No error has occurred in getting comment notifications of user. Will notify users of new comment.');
                }
            }
        ).then(commentNotifications => {
            console.log('commentNotifications: ', commentNotifications);
            commentNotifications.forEach(({ _id: notifyUserId, notifications }) => {
                const _commentNotifications = (notifications && notifications.comments && notifications.comments.length) && notifications.comments
                const { isPostPresent, hasCommented } = checkForCurrentUserComment(_commentNotifications, userId, postId);
                console.log({
                    isPostPresent, hasCommented
                });
                if (isPostPresent && hasCommented) {
                    console.log('Case 1 commentNotifications')
                    User.updateOne(
                        { _id: notifyUserId },
                        {
                            $addToSet:
                            {
                                'notifications.comments.$[post].comments.$[comment].commentsByAuthor': { id: commentId, isMarkedRead: false }
                            }
                        },
                        {
                            arrayFilters: [{ 'post.postId': postId }, { 'comment.authorId': userId }]
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('An error has occurred in notifying user: ', error);
                            } else {
                                console.log('User was notified of comment. Case 1 was implemented, numsAffected: ', numsAffected);
                            }
                        }
                    )
                } else if (isPostPresent && !hasCommented) {
                    // the post exits but the current user hasn't commented on the current post yet
                    console.log('Case 2 commentNotifications');
                    User.updateOne(
                        { _id: notifyUserId },
                        {
                            $addToSet:
                            {
                                'notifications.comments.$[post].comments': { authorId: userId, commentsByAuthor: [{ id: commentId, isMarkedRead: false }] }
                            }
                        },
                        {
                            arrayFilters: [{ 'post.postId': postId }]
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('An error has occurred in notifying user: ', error);
                            } else {
                                console.log('User was notified of comment. Case 2 was implemented, numsAffected: ', numsAffected);
                            }
                        }
                    )
                } else {
                    console.log('Case 3 commentNotifications');
                    User.updateOne(
                        { _id: notifyUserId },
                        {
                            $addToSet:
                            {
                                'notifications.comments': { postId: postId, comments: [{ authorId: userId, commentsByAuthor: [{ id: commentId, isMarkedRead: false }] }] }
                            }
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('An error has occurred in notifying user: ', error);
                            } else {
                                console.log('User was notified of comment. Case 3 was implemented, numsAffected: ', numsAffected);
                            }
                        }
                    )
                }
            })
        });
    } else if (name === 'replyLikeNotification') {
        // GOAL: notify the author of a reply when it gets a new reply
        const { notifyUserId } = request.body;
        const { postId, commentId, replyId, userIdOfLike } = data;

        const newReplyLikeNotification = {
            postId: postId,
            commentsRepliedTo: [{ commentId: commentId, replies: [{ replyId: replyId, userIdsOfLikes: [{ userId: userIdOfLike, isMarkedRead: false }] }] }]
        };

        // GOAL: when the reply like notification is deleted by the current user unliking the reply, when the user relikes it again, push the id of the current user into the userIdsOfLikes for that reply 
        // WHAT IS HAPPENING: 
        // it is showing that the reply id doesn't exist 
        User.findOne({ _id: notifyUserId }, { 'notifications.likes.replies': 1, _id: 0 }).then(result => {
            const replyLikesNotifications = (result.notifications && result.notifications.likes && result.notifications.likes.replies && result.notifications.likes.replies.length) && result.notifications.likes.replies
            if (replyLikesNotifications) {

                const { isPostPresent, isCommentPresent, isReplyPresent } = checkLikesInfo(data, replyLikesNotifications, { isReply: true });
                console.log({
                    isPostPresent, isCommentPresent, isReplyPresent
                })
                if (isPostPresent && isCommentPresent && isReplyPresent) {
                    console.log('case 1 reply like notifications')
                    // GOAL: push the following into userIdsOfLikes for the object that contains the liked reply: {userId, isMarkedRead: false}
                    // the reply was already liked before, push the new id of liked into userIdsOfLikes
                    User.updateOne(
                        { _id: notifyUserId },
                        {
                            $addToSet:
                            {
                                'notifications.likes.replies.$[post].commentsRepliedTo.$[comment].replies.$[reply].userIdsOfLikes': { userId: userIdOfLike, isMarkedRead: false }
                            }
                        },
                        {
                            arrayFilters: [{ 'post.postId': postId }, { 'comment.commentId': commentId }, { 'reply.replyId': replyId }]
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('An error has occurred in notifying author of reply of new like: ', error);
                            } else {
                                console.log('Case 1. User was notified of reply like, numsAffected: ', numsAffected);
                            }
                        }
                    );
                } else if (isPostPresent && isCommentPresent && !isReplyPresent) {
                    console.log('case 2 reply like notifications')
                    User.updateOne(
                        { _id: notifyUserId },
                        {
                            $addToSet:
                            {
                                'notifications.likes.replies.$[post].commentsRepliedTo.$[comment].replies': { replyId: replyId, userIdsOfLikes: [{ userId: userIdOfLike, isMarkedRead: false }] }
                            }
                        },
                        {
                            arrayFilters: [{ 'post.postId': postId }, { 'comment.commentId': commentId }]
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('An error has occurred in notifying author of reply of new like: ', error);
                            } else {
                                console.log('Case 2. User was notified of reply like, numsAffected: ', numsAffected);
                            }
                        }
                    );
                } else if (isPostPresent && !isCommentPresent && !isReplyPresent) {
                    console.log('case 3 reply like notifications')
                    User.updateOne(
                        { _id: notifyUserId },
                        {
                            $addToSet:
                            {
                                'notifications.likes.replies.$[post].commentsRepliedTo': { commentId: commentId, replies: [{ replyId: replyId, userIdsOfLikes: [{ userId: userIdOfLike, isMarkedRead: false }] }] }
                            }
                        },
                        {
                            arrayFilters: [{ 'post.postId': postId }]
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('An error has occurred in notifying author of reply of new like: ', error);
                            } else {
                                console.log('Case 3. User was notified of reply like, numsAffected: ', numsAffected);
                            }
                        }
                    );
                } else {
                    console.log('case 4 rib eye reply like notifications')
                    notifyUserOfNewReplyLike(notifyUserId, newReplyLikeNotification);
                };
            } else {
                console.log('No notification for reply likes. Will make them. Case 5 rib eye reply like notification')
                notifyUserOfNewReplyLike(notifyUserId, newReplyLikeNotification);
            }
        })
        response.json('notifying author of reply of new like.');
    } else if (name === 'deleteReplyLikeNotification') {
        const { notifyUserId } = request.body;
        const { postId, commentId, replyId, userIdOfLike } = data;
        console.log('request.body: ', request.body);
        User.updateOne(
            { _id: notifyUserId },
            {
                $pull:
                {
                    'notifications.likes.replies.$[post].commentsRepliedTo.$[comment].replies.$[reply].userIdsOfLikes': { userId: userIdOfLike }
                }
            },
            {
                arrayFilters: [{ 'post.postId': postId }, { 'comment.commentId': commentId }, { 'reply.replyId': replyId }]
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('An error has occurred in deleting the notification for the author of the reply: ', error);
                } else {
                    console.log('Reply notification for author of reply was deleted, numsAffected: ', numsAffected);
                    response.json('Reply notification for author of reply was deleted.')
                }
            }
        );
    } else if (name === 'commentLikeNotification') {
        const { notifyUserId } = request.body;
        const { postId, commentId, userIdOfLike } = data;
        const newCommentNotification = {
            postId,
            comments: [{ commentId, userIdsOfLikes: [{ userId: userIdOfLike, isMarkedRead: false }] }]
        };
        // CASE #1: first like of the user comment

        // CASE #2: there are already likes for the user's comment
        // GOAL: when there are likes for the user's comments, find the comment id and push the following object into userIdsOfLikes: {userId, isMarkedRead: false}
        // the following is pushed into the userIdOfLikes: {userId, isMarkedRead: false}
        // the userIdsOfLikes field is accessed 
        // the comment that was liked is found by using the comment id
        // filter through the comments field
        // the notifications.likes.comments is accessed 
        // if isCommentPresent and isPostPresent, then push the following object into userIdsOfLikes: {userId, isMarkedRead: false}
        // isCommentPresent is set to true
        // is isPostPresent is set to true
        // the comment is present 
        // the post present
        // if the post and the comment is present, then set the following to true: isCommentPresent and isPostPresent
        User.findOne({ _id: notifyUserId }, { 'notifications.likes.comments': 1, _id: 0 }).then(result => {
            const commentLikesNotifications = (result.notifications && result.notifications.likes && result.notifications.likes.comments && result.notifications.likes.comments.length) && result.notifications.likes.comments;
            if (commentLikesNotifications) {
                const { isCommentPresent, isPostPresent } = checkLikesInfo(data, commentLikesNotifications, { isComment: true });
                if (isPostPresent && isCommentPresent) {
                    console.log('case 1 comments notifications')
                    User.updateOne(
                        { _id: notifyUserId },
                        {
                            $addToSet:
                            {
                                'notifications.likes.comments.$[postOfComment].comments.$[comment].userIdsOfLikes': { userId: userIdOfLike, isMarkedRead: false }
                            }
                        },
                        {
                            arrayFilters: [{ 'postOfComment.postId': postId }, { 'comment.commentId': commentId }]
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('An error has occurred in notifying author of comment of new like ', error);
                            } else {
                                console.log('Case 1. Comment notification for author of comment was sent, numsAffected: ', numsAffected);
                            }
                        }
                    );
                } else if (isPostPresent && !isCommentPresent) {
                    console.log('case 2 comments notifications')
                    // the current user is the first user to like a comment by userA on a post, but has liked other comments either by userA or not
                    User.updateOne(
                        { _id: notifyUserId },
                        {
                            $addToSet:
                            {
                                'notifications.likes.comments.$[postOfComment].comments': { commentId: commentId, userIdsOfLikes: [{ userId: userIdOfLike, isMarkedRead: false }] }
                            }
                        },
                        {
                            arrayFilters: [{ 'postOfComment.postId': postId }]
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('An error has occurred in notifying author of comment of new like ', error);
                            } else {
                                console.log('Case 2. Comment notification for author of comment was sent, numsAffected: ', numsAffected);
                            }
                        }
                    );
                } else {
                    console.log('case 3 comments notifications')
                    addCommentNotification(notifyUserId, newCommentNotification);
                }
            } else {
                console.log('case 4 comments notifications')
                addCommentNotification(notifyUserId, newCommentNotification)
            };
            response.json('Will notify author of comment of new like.')
        })
    } else if (name === 'deleteCommentNotification') {
        const { notifyUserId } = request.body;
        const { postId, commentId, userIdOfLike } = data;
        User.updateOne(
            { _id: notifyUserId },
            {
                $pull:
                {
                    'notifications.likes.comments.$[postOfComment].comments.$[comment].userIdsOfLikes': { userId: userIdOfLike }
                }
            },
            {
                arrayFilters: [{ 'postOfComment.postId': postId }, { 'comment.commentId': commentId }]
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('An error has occurred in notifying author of comment of new like ', error);
                } else {
                    console.log('Deleted comment notification, numsAffected: ', numsAffected);
                }
            }
        );
        response.json('Deleted the comment notification that was sent to the author of comment.');
    } else if (name === 'postLikeNotification') {
        // GOAL: check if the there are post likes present for the current post that was liked 
        const { notifyUserId } = request.body;
        const { postId, userIdOfLike } = data;
        const newPostLikeNotification = {
            postId,
            userIdsOfLikes: [{ userId: userIdOfLike, isMarkedRead: false }]
        }
        User.findOne({ _id: notifyUserId }, { 'notifications.likes.posts': 1, _id: 0 }).then(result => {
            const postLikesNotifications = (result.notifications && result.notifications.likes && result.notifications.likes.posts && result.notifications.likes.posts.length) && result.notifications.likes.posts;
            if (postLikesNotifications) {
                const { isPostPresent } = checkLikesInfo(data, postLikesNotifications);
                if (isPostPresent) {
                    console.log('Post like notification, case 1')
                    User.updateOne(
                        { _id: notifyUserId },
                        {
                            $addToSet:
                            {
                                'notifications.likes.posts.$[post].userIdsOfLikes': { userId: userIdOfLike, isMarkedRead: false }
                            }
                        },
                        {
                            arrayFilters: [{ 'post.postId': postId }]
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('Case 1. An error has occurred in notifying author of comment of new like ', error);
                            } else {
                                console.log('Case 1. Post like notification was sent, numsAffected: ', numsAffected);
                            }
                        }
                    )
                } else {
                    console.log('Post like notification, case 2');
                    addPostNotification(notifyUserId, newPostLikeNotification);
                }
            } else {
                console.log('Post like notification, case 3. Will create notifications.likes.posts');
                addPostNotification(notifyUserId, newPostLikeNotification);
            }
        })
        response.json('Author of post will be notified of new like')
    } else if (name === 'deletePostLikeNotification') {
        const { notifyUserId } = request.body;
        const { postId, userIdOfLike } = data;
        User.updateOne(
            { _id: notifyUserId },
            {
                $pull:
                {
                    'notifications.likes.posts.$[post].userIdsOfLikes': { userId: userIdOfLike }
                }
            },
            {
                arrayFilters: [{ 'post.postId': postId }]
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Case 1. An error has occurred in deleting notification for the author of the post ', error);
                } else {
                    console.log('Post like notification for author was deleted, numsAffected: ', numsAffected);
                    response.json('Notification of post like for author was deleted.');
                }
            }
        );
    } else if (name === 'notifyFollowersOfNewPost') {
        console.log('request.body: ', request.body);
        const { userId: authorId } = request.body;
        const { postId } = data;
        // CHECK THIS CODE AGAIN
        User.findOne({ _id: authorId }, { followers: 1, _id: 0 }).then(result => {
            if (result.followers && result.followers.length) {
                const { followers } = result;
                const followerIds = followers.map(({ userId }) => userId);
                followerIds.forEach(_notifyUserId => {
                    User.findOne({ _id: _notifyUserId }, { 'notifications.newPostsFromFollowing': 1, _id: 0, username: 1 }).then(results => {
                        const newPostsFromFollowing = (results.notifications && results.notifications.newPostsFromFollowing && results.notifications.newPostsFromFollowing.length) && results.notifications.newPostsFromFollowing;
                        const isAuthorPresent = newPostsFromFollowing && newPostsFromFollowing.map(({ authorId: _authorId }) => _authorId).includes(authorId);
                        if (isAuthorPresent) {
                            console.log('notify following of new post, case 1')
                            User.updateOne(
                                { _id: _notifyUserId },
                                {
                                    $addToSet:
                                    {
                                        'notifications.newPostsFromFollowing.$[post].newPostIds': { postId: postId, isMarkedRead: false }
                                    }
                                },
                                {
                                    arrayFilters: [{ 'post.authorId': authorId }]
                                },
                                (error, numsAffected) => {
                                    if (error) {
                                        console.error(`An error has occurred in notifying ${results.username}: `, error);
                                    } else {
                                        console.log(`Case 1. ${results.username} was notified, numsAffected: `, numsAffected);
                                    }
                                }
                            );
                        } else {
                            console.log('notify following of new post, case 2')
                            User.updateOne(
                                { _id: _notifyUserId },
                                {
                                    $addToSet:
                                    {
                                        'notifications.newPostsFromFollowing': { authorId: authorId, newPostIds: [{ postId: postId, isMarkedRead: false }] }
                                    }
                                },
                                (error, numsAffected) => {
                                    if (error) {
                                        console.error(`An error has occurred in notifying ${results.username}: `, error);
                                    } else {
                                        console.log(`Case 2. ${results.username} was notified, numsAffected: `, numsAffected);
                                    }
                                }
                            );
                        }
                    })
                });
            }
        })
        response.json('Will notify the following of current user of new post if user has any followers.')
    }
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
    console.log('package: ', package);
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
    } else if (name === 'getNotifications') {
        console.log('package: ', package);
        const { willGetReplies, willGetReplyLikes, willGetCommentLikes, willGetPostLikes, willGetComments, willGetPostsFromFollowing, willGetNewFollowers } = package;
        //  NOTES:
        // get all seven notifications and send them individual back to the client 
        // CASE#1: a user replies to another user on the current user's post
        // send a boolean value to the server that will determine what notification to get for the user


        // CASE#2: A user replies to the current user on some else's post



        // GOAL: GET ALL OF THE REPLY NOTIFICATIONS
        // CASE#1:
        User.findOne({ _id: userId }, { _id: 0, notifications: 1, publishedDrafts: 1, followers: 1 }).then(result => {
            console.log('result: ', result);
            const { publishedDrafts, notifications, followers } = result;
            if (notifications) {
                const { replies, comments, likes, newPostsFromFollowing, newFollowers } = notifications;
                if (willGetReplies && (replies && replies.length)) {
                    const postIdsOfReplies = replies.map(({ postId }) => postId);
                    let authorIds = [];
                    let commentIdsRepliedTo = [];
                    replies.forEach(({ repliesInfo }) => {
                        repliesInfo.forEach(({ commentsRepliedTo, commentAuthorId }) => {
                            const isAuthorIdPresent = authorIds.length && authorIds.includes(commentAuthorId)
                            !isAuthorIdPresent && authorIds.push(commentAuthorId);
                            commentsRepliedTo.forEach(({ replies, id: commentId }) => {
                                commentIdsRepliedTo.push(commentId);
                                replies.forEach(({ authorId: replyAuthorId }) => {
                                    const isAuthorIdPresent = authorIds.length && authorIds.includes(replyAuthorId);
                                    !isAuthorIdPresent && authorIds.push(replyAuthorId);
                                });
                            })

                        })
                    });
                    // BlogPost.find(
                    //     { _id: { $in: postIdsOfReplies } },
                    //     { title: 1, comments: 1 },
                    //     error => {
                    //         if (error) {
                    //             console.error('An error has occurred in getting the posts of the replies')
                    //         } else {
                    //             console.log('No error has occurred in getting the posts of the replies')
                    //         }
                    //     }
                    // )

                    // User.find(
                    //     { _id: authorIds },
                    //     { username: 1, iconPath: 1 },
                    //     error => {
                    //         if (error) {
                    //             console.error('An error has occurred in getting the user info of the author of replies');
                    //         } else {
                    //             console.log('No error has occurred in getting the user info of the author of replies.')
                    //         }
                    //     }
                    // )

                    BlogPost.find(
                        { _id: { $in: postIdsOfReplies } },
                        { title: 1, comments: 1, authorId: 1 },
                        error => {
                            if (error) {
                                console.error('An error has occurred in getting the posts of the replies')
                            } else {
                                console.log('No error has occurred in getting the posts of the replies')
                            }
                        }
                    ).then(infoOfAuthors => {
                        const _infoOfAuthors = infoOfAuthors.map(({ authorId }) => authorId);
                        authorIds = [...authorIds, ..._infoOfAuthors];
                        authorIds = [...new Set(authorIds)];
                        User.find(
                            { _id: authorIds },
                            { username: 1, iconPath: 1 },
                            error => {
                                if (error) {
                                    console.error('An error has occurred in getting the user info of the author of replies');
                                } else {
                                    console.log('No error has occurred in getting the user info of the author of replies.')
                                }
                            }
                        ).then(postsOfReplies => {
                            let notificationsToDel;
                            console.log('replies: ', replies);
                            let replies_ = replies.map(reply => {
                                const { postId, repliesInfo } = reply;
                                const targetPost = postsOfReplies.find(({ _id }) => _id === postId);
                                // if the comment doesn't exist, then that means the user deleted the comments
                                // the comments doesn't exist
                                // the user deleted the comments
                                // if the user deleted the comments, then delete the reply notification 
                                let repliesInfo_;
                                if (targetPost && targetPost.comments && targetPost.comments.length) {
                                    repliesInfo_ = repliesInfo.map(replyInfo => {
                                        // CASE1: THE COMMENT AUTHOR DOESN'T EXIST
                                        // CASE2: THE COMMENT DOESN'T EXIST
                                        const { commentsRepliedTo, commentAuthorId } = replyInfo;
                                        const doesCommentUserExist = infoOfAuthors.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(commentAuthorId))
                                        if (doesCommentUserExist) {
                                            const _commentsRepliedTo = commentsRepliedTo.map(comment => {
                                                const { id: _commentId, replies } = comment;
                                                // does the comment on the post exist?
                                                const commentOnPost = targetPost.comments.find(({ commentId }) => commentId === _commentId);
                                                if (commentOnPost && commentOnPost.replies && commentOnPost.replies.length) {
                                                    const _replies = replies.map(replyInfo => {
                                                        const { authorId, replyIds } = replyInfo;
                                                        const replyAuthor = infoOfAuthors.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                                        if (replyAuthor && replyIds && replyIds.length) {
                                                            const _replyIds = replyIds.map(reply => {
                                                                // const { _reply, createdAt } = commentOnPost.replies.find(({ replyId }) => replyId === reply.id);
                                                                const targetReply = commentOnPost.replies.find(({ replyId }) => replyId === reply.id);
                                                                // MS = miliSeconds
                                                                if (targetReply) {
                                                                    const { _reply, createdAt } = targetReply;
                                                                    const timeElapsedText = _getTimeElapsedText(createdAt);
                                                                    // CU = current user
                                                                    const isPostByCU = publishedDrafts.includes(postId);
                                                                    const isCommentByCU = commentAuthorId === userId;
                                                                    let notificationText;
                                                                    if (isPostByCU && isCommentByCU) {
                                                                        notificationText = `${replyAuthor.username} replied to your comment on your post `
                                                                    } else if (isPostByCU) {
                                                                        notificationText = `${replyAuthor.username} replied to a comment that you've replied to on your post `
                                                                    } else if (isCommentByCU) {
                                                                        notificationText = `${replyAuthor.username} replied to your comment on post `;
                                                                    } else {
                                                                        notificationText = `${replyAuthor.username} replied to a comment that you've replied to on post `
                                                                    };

                                                                    return {
                                                                        ...reply,
                                                                        //MS = miliSeconds
                                                                        userIcon: replyAuthor.iconPath,
                                                                        timePostedInMS: createdAt.miliSeconds,
                                                                        timeElapsedText,
                                                                        notificationText,
                                                                        replyText: _reply,
                                                                    };

                                                                } else {
                                                                    // if the reply doesn't exist, then delete the reply from the object that contains the id of the author and their replies 
                                                                    // notificationsToDel = addNotificationToDel(notificationsToDel, reply.id, 'willDelReplies');
                                                                }

                                                                return reply;
                                                            });

                                                            return {
                                                                ...replyInfo,
                                                                replyIds: _replyIds
                                                            };
                                                        } else {
                                                            // if the author of the reply no longer exist, then delete the reply author from replies 
                                                            // notificationsToDel = addNotificationToDel(notificationsToDel, authorId, 'willDelReplyAuthors');
                                                        };

                                                        return replyInfo;
                                                    })

                                                    return {
                                                        ...comment,
                                                        replies: _replies
                                                    }
                                                } else {
                                                    // NOTE: for the 
                                                    // if the comment doesn't exist, then delete the comment id from the notification 
                                                    // notificationsToDel = addNotificationToDel(notificationsToDel, _commentId, 'willDelComments');
                                                };

                                                return comment;
                                            });

                                            return {
                                                ...replyInfo,
                                                commentsRepliedTo: _commentsRepliedTo
                                            }
                                        } else {
                                            // delete the author of the comment
                                            // notificationsToDel = addNotificationToDel(notificationsToDel, commentAuthorId, 'willDelCommentAuthors')
                                        };

                                        return replyInfo;
                                    });
                                } else {
                                    // delete the whole entire post from the notifications field
                                    // notificationsToDel = addNotificationToDel(notificationsToDel, postId, 'willDelPosts')

                                }

                                return repliesInfo_ ?
                                    {
                                        ...reply,
                                        repliesInfo: repliesInfo_,
                                        postTitle: targetPost.title
                                    }
                                    :
                                    reply

                            });
                            if (notificationsToDel) {
                                // WILL REFACTOR LATER

                                // const willDelReplies = notificationsToDel.find(({ willDelReplies }) => !!willDelReplies);
                                // const willDelReplyAuthors = notificationsToDel.find(({ willDelReplyAuthors }) => !!willDelReplyAuthors);
                                // const willDelCommentAuthors = notificationsToDel.find(({ willDelCommentAuthors }) => !!willDelCommentAuthors);
                                // const willDelComments = notificationsToDel.find(({ willDelComments }) => !!willDelComments);
                                // const willDelPosts = notificationsToDel.find(({ willDelPosts }) => !!willDelPosts);
                                // let _notifications;

                                // if (willDelReplies) {
                                //     const replyIds = willDelReplies.itemsToDel;
                                //     _notifications = delNonexistentReplies(replies_, replyIds);
                                // };
                                // if (willDelReplyAuthors) {
                                //     const replyAuthorIds = willDelReplyAuthors.itemsToDel;
                                //     _notifications = _notifications ? delNonexistentReplyAuthors(_notifications, replyAuthorIds) : delNonexistentReplyAuthors(replies_, replyAuthorIds)
                                // };
                                // if (willDelCommentAuthors) {
                                //     const commentAuthorIds = willDelCommentAuthors.itemsToDel;
                                //     _notifications = _notifications ? delNonexistentCommAuthors(_notifications, commentAuthorIds) : delNonexistentCommAuthors(replies_, commentAuthorIds)
                                // };
                                // if (willDelComments) {
                                //     const commentIds = willDelComments.itemsToDel;
                                //     _notifications = _notifications ? delNonexistentComms(_notifications, commentIds) : delNonexistentComms(replies_, commentIds)
                                // };
                                // if (willDelPosts) {
                                //     const postIds = willDelPosts.itemsToDel;
                                //     _notifications = _notifications ? delNonexistentPosts(_notifications, postIds) : delNonexistentPosts(replies_, postIds)
                                // };

                                // response.json({ replies: _notifications })
                            } else {
                                response.json(replies_)
                            }
                        })
                    });
                } else if (willGetReplies) {
                    response.json({ isEmpty: true })
                }

                if (willGetReplyLikes && (likes && likes.replies && likes.replies.length)) {
                    const { replies: replyLikes } = likes;
                    let userIdsOfReplyLikes = [];
                    let postIds = [];
                    replyLikes.forEach(({ commentsRepliedTo, postId }) => {
                        !postIds.includes(postId) && postIds.push(postId);
                        commentsRepliedTo.forEach(({ replies }) => {
                            replies.forEach(({ userIdsOfLikes }) => {
                                if (userIdsOfLikes && userIdsOfLikes.length) {
                                    userIdsOfLikes.forEach(({ userId }) => {
                                        !userIdsOfReplyLikes.includes(userId) && userIdsOfReplyLikes.push(userId);
                                    });
                                }
                            })
                        })
                    });
                    User.find(
                        { _id: { $in: userIdsOfReplyLikes } },
                        { username: 1, iconPath: 1 },
                        error => {
                            if (error) {
                                console.error('An error has occurred in getting the users of the reply likes');
                            } else {
                                console.log('No error has occurred in getting the users of the reply likes.')
                            }
                        }
                    ).then(commentLikesUsers => {
                        console.log("postIds: ", postIds);
                        BlogPost.find(
                            { _id: { $in: postIds } },
                            { comments: 1, title: 1 },
                            error => {
                                if (error) {
                                    console.error("THE ERROR YOO: ", error);
                                }
                            }
                        ).then(targetPosts => {
                            console.log('targetPosts: ', targetPosts);
                            let delNotifications = [];
                            const _replyLikes = replyLikes.map(replyLike => {
                                const { postId, commentsRepliedTo } = replyLike;
                                const targetPost = targetPosts.find(({ _id }) => _id === postId);
                                let _commentsRepliedTo;
                                // check if the post exist, and there are still comments on the post 
                                if (targetPost && targetPost.comments && targetPost.comments.length) {
                                    _commentsRepliedTo = commentsRepliedTo.map(comment => {
                                        const { replies, commentId } = comment;
                                        // THE COMMENT WON'T EXIST WHEN THE USER DELETES THEIR ACCOUNT
                                        // check if the comment exist
                                        const targetComment = targetPost.comments.find(({ commentId: _commentId }) => _commentId === commentId);
                                        if (targetComment) {
                                            const _replies = replies.map(reply => {
                                                const targetReply = targetComment.replies.find(({ replyId }) => replyId === reply.replyId);
                                                // check if the reply exist
                                                if (targetReply && reply.userIdsOfLikes && reply.userIdsOfLikes.length) {
                                                    const _userIdsOfLikes = reply.userIdsOfLikes.map(user => {
                                                        console.log('commentLikesUsers: ', commentLikesUsers)
                                                        const userOfLike = commentLikesUsers.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(user.userId));
                                                        // check if the user still exist
                                                        console.log('userIdOfLike: ', userOfLike);
                                                        if (userOfLike) {
                                                            const { likedAt } = targetReply.userIdsOfLikes.find(({ userId }) => userId === user.userId);
                                                            const timeElapsedText = _getTimeElapsedText(likedAt);
                                                            // CU = current user
                                                            const isPostByCU = publishedDrafts.includes(postId);
                                                            const notificationText = isPostByCU ? `${userOfLike.username} liked your reply on your post ` : `${userOfLike.username} liked your reply on post `;

                                                            return {
                                                                ...user,
                                                                timeElapsedText,
                                                                notificationText,
                                                                userIcon: userOfLike.iconPath,
                                                                likedAt: likedAt.miliSeconds
                                                            };
                                                        } else {
                                                            // if the user doesn't exist, then find the user in the userIdsOfLikes and delete the userId from replies 
                                                            // delNotifications.push({ postId, commentId, replyId: reply.replyId, userId });

                                                            return user
                                                        }
                                                    })

                                                    return {
                                                        ...reply,
                                                        userIdsOfLikes: _userIdsOfLikes
                                                    }
                                                } else {
                                                    // if the reply doesn't exist, then delete the rely
                                                    // delNotifications.push({ postId, commentId, replyId: reply.replyId });

                                                    return reply
                                                };
                                            });

                                            return {
                                                ...comment,
                                                replies: _replies
                                            }
                                        } else {
                                            // if the comment doesn't exist, then delete the comment from the replies var
                                            // delNotifications.push({ postId, commentId });
                                        };

                                        return comment;
                                    });


                                } else {
                                    // if postId is not found im the blogPost collection, then delete the whole entire object by using the post id 
                                    // delNotifications.push({ postId });
                                };

                                return _commentsRepliedTo ?
                                    {
                                        ...replyLike,
                                        commentsRepliedTo: _commentsRepliedTo,
                                        title: targetPost.title
                                    }
                                    :
                                    replyLike
                            });
                            if (delNotifications.length) {
                                console.log("delNotifications: ", delNotifications);
                                //  GOAL: MAKE DELETION OF REPLY LIKES OCCUR AFTER THE FOLLOWING IS COMPLETE: THE notifications are displayed on the UI, the user's activities are displayed on the UI, the search feature is functional, the message feature is functional, the website is responsive    
                            } else {
                                console.log('_replyLikes: ', _replyLikes);
                                response.json(_replyLikes);
                            }
                        })
                    })

                } else if (willGetReplyLikes) {
                    response.json({ isEmpty: true })
                }

                if (willGetCommentLikes && (likes && likes.comments && likes.comments.length)) {
                    let userIdsOfCommentLikes = [];
                    let postIds = [];
                    const { comments: commentLikes } = likes;
                    // CU = 'current user'
                    let commentIdsByCU = [];
                    commentLikes.forEach(({ comments, postId }) => {
                        !postIds.includes(postId) && postIds.push(postId);
                        // GOAL: get the userIds of the comment likes
                        comments.forEach(({ commentId, userIdsOfLikes }) => {
                            !commentIdsByCU.includes(commentId) && commentIdsByCU.push(commentId);
                            userIdsOfLikes.forEach(({ userId }) => {
                                !userIdsOfCommentLikes.includes(userId) && userIdsOfCommentLikes.push(userId);
                            })
                        })
                    });
                    User.find(
                        { _id: { $in: userIdsOfCommentLikes } },
                        { username: 1, iconPath: 1 },
                        error => {
                            if (error) {
                                console.error('An error has occurred in getting the users of the reply likes');
                            } else {
                                console.log('No error has occurred in getting the users of the reply likes.')
                            }
                        }
                    ).then(commentLikesUsers => {
                        console.log("postIds: ", postIds);
                        BlogPost.find(
                            { _id: { $in: postIds } },
                            { comments: 1, title: 1 },
                            error => {
                                if (error) {
                                    console.error("THE ERROR YOO: ", error);
                                }
                            }
                        ).then(targetPosts => {
                            console.log('targetPosts: ', targetPosts);
                            let delNotifications;
                            if (targetPosts.length && commentLikesUsers.length) {
                                let _commentLikes = commentLikes.map(commentLike => {
                                    const { postId, comments } = commentLike;
                                    const targetPost = targetPosts.find(({ _id }) => _id === postId);
                                    let _comments;
                                    // check if the post exist, and there are still comments on the post 
                                    if (targetPost && targetPost.comments && targetPost.comments.length) {
                                        _comments = comments.map(comment => {
                                            const { commentId, userIdsOfLikes } = comment;
                                            const targetComment = targetPost.comments.find(({ commentId: _commentId }) => commentId === _commentId);
                                            // check if the comment exist
                                            if (targetComment && userIdsOfLikes && userIdsOfLikes.length) {
                                                const _userIdsOfLikes = userIdsOfLikes.map(user => {
                                                    const userOfLike = commentLikesUsers.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(user.userId));
                                                    if (userOfLike) {
                                                        const { likedAt } = targetComment.userIdsOfLikes.find(({ userId }) => userId === user.userId);
                                                        const timeElapsedText = _getTimeElapsedText(likedAt);
                                                        // CU = current user 
                                                        const isPostByCU = publishedDrafts.includes(postId);
                                                        const notificationText = isPostByCU ? `${userOfLike.username} liked your reply on your post ` : `${userOfLike.username} liked your reply on post `;

                                                        return {
                                                            ...user,
                                                            timeElapsedText,
                                                            notificationText,
                                                            userIcon: userOfLike.iconPath,
                                                            likedAt: likedAt.miliSeconds
                                                        }

                                                    } else {
                                                        return user;
                                                    };
                                                });

                                                return {
                                                    ...comment,
                                                    userIdsOfLikes: _userIdsOfLikes
                                                }
                                            } else {
                                                return comment;
                                            }
                                        })
                                    } else {
                                        // if postId is not found im the blogPost collection, then delete the whole entire object by using the post id 
                                        // delNotifications.push({ postId });
                                    };

                                    return _comments ?
                                        {
                                            ...commentLike,
                                            comments: _comments,
                                            title: targetPost.title
                                        }
                                        :
                                        commentLike
                                });

                                if (delNotifications) {

                                    response.json(_commentLikes);
                                } else {
                                    // if the array is not empy, then send the below to the client 
                                    console.log('_commentLikes: ', _commentLikes);
                                    response.json(_commentLikes);
                                }
                            } else {
                                response.json({ isEmpty: true })
                            }
                        })
                    })
                } else if (willGetCommentLikes) {
                    response.json({ isEmpty: true })
                };

                if (willGetPostLikes && (likes && likes.posts && likes.posts.length)) {
                    const { posts: postLikes } = likes;
                    // GOAL: send the postLikesNotifications array to the client with all of its info for the notifications
                    // the 'userIdsOfLikes' is modified and the notifications array is sent tot the client
                    // for each notification insert the following: {the time of the like, the user of the like, create the notification text that wil be displayed on the UI}
                    // the user exist
                    // if the user doesn't exist then return the whole entire object without modification
                    // check if the user exist
                    const postIds = postLikes.map(({ postId }) => postId);
                    let userIdsOfPostLikes = [];
                    postLikes.forEach(({ userIdsOfLikes }) => {
                        userIdsOfLikes.forEach(({ userId }) => {
                            !userIdsOfPostLikes.includes(userId) && userIdsOfPostLikes.push(userId);
                        })
                    })
                    User.find(
                        { _id: { $in: userIdsOfPostLikes } },
                        { username: 1, iconPath: 1 },
                        error => {
                            if (error) {
                                console.error('An error has occurred in getting the users of the reply likes');
                            } else {
                                console.log('No error has occurred in getting the users of the reply likes.')
                            }
                        }
                    ).then(postLikesUsers => {
                        console.log("postIds: ", postIds);
                        BlogPost.find(
                            { _id: { $in: postIds } },
                            { userIdsOfLikes: 1, title: 1 },
                            error => {
                                if (error) {
                                    console.error("THE ERROR YOO: ", error);
                                }
                            }
                        ).then(targetPosts => {
                            console.log('targetPosts: ', targetPosts);
                            let delNotifications;
                            if (targetPosts.length && postLikesUsers.length) {
                                let _postLikes = postLikes.map(postLike => {
                                    const { postId, userIdsOfLikes: userIdsLikeAlert } = postLike;
                                    const targetPost = targetPosts.find(({ _id }) => _id === postId);
                                    let _userIdsOfLikes;
                                    // check if the target post has any likes and check if the userIdsLikeAlert has any users 
                                    console.log('targetPost: ', targetPost);
                                    if ((targetPost && targetPost.userIdsOfLikes && targetPost.userIdsOfLikes.length) && (userIdsLikeAlert && userIdsLikeAlert.length)) {
                                        _userIdsOfLikes = userIdsLikeAlert.map(user => {
                                            const userOfLike = postLikesUsers.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(user.userId));
                                            console.log('userOfLike: ', userOfLike);
                                            if (userOfLike) {
                                                const { likedAt } = targetPost.userIdsOfLikes.find(({ userId }) => userId === user.userId);
                                                const timeElapsedText = _getTimeElapsedText(likedAt);

                                                return {
                                                    ...user,
                                                    timeElapsedText,
                                                    userIcon: userOfLike.iconPath,
                                                    notificationText: `${userOfLike.username} liked your post `,
                                                    likedAt: likedAt.miliSeconds
                                                }
                                            }
                                        })
                                    } else {
                                        // push the notification the will be deleted here
                                    }

                                    return _userIdsOfLikes ?
                                        {
                                            ...postLike,
                                            userIdsOfLikes: _userIdsOfLikes,
                                            title: targetPost.title
                                        }
                                        :
                                        postLike
                                });

                                if (delNotifications) {

                                    response.json(_postLikes);
                                } else {
                                    // if the array is not empty, then send the below to the client 
                                    console.log('_postLikes: ', _postLikes);
                                    response.json(_postLikes);
                                }
                            } else {
                                response.json({ isEmpty: true })
                            }
                        })
                    })
                } else if (willGetPostLikes) {
                    response.json({ isPostLikesEmpty: true })
                }

                if (willGetComments && comments && comments.length) {
                    const postIdsOfComments = comments.map(({ postId }) => postId);
                    let authorIdsOfComments = [];
                    comments.forEach(({ comments }) => {
                        comments.forEach(({ authorId }) => { !authorIdsOfComments.includes(authorId) && authorIdsOfComments.push(authorId) });
                    });

                    User.find(
                        { _id: { $in: authorIdsOfComments } },
                        { username: 1, iconPath: 1 },
                        error => {
                            if (error) {
                                console.error('An error has occurred in getting the user info of the author of replies');
                            } else {
                                console.log('No error has occurred in getting the user info of the author of replies.')
                            }
                        }
                    ).then(commentAuthors => {
                        BlogPost.find(
                            { _id: { $in: postIdsOfComments } },
                            { title: 1, comments: 1 },
                            error => {
                                if (error) {
                                    console.error('An error has occurred in getting the posts of the replies')
                                } else {
                                    console.log('No error has occurred in getting the posts of the replies')
                                }
                            }
                        ).then(postsOfComments => {
                            let notificationsToDel;
                            let commentNotifications = comments.map(post => {
                                const { postId, comments: commentsOnPost } = post;
                                const targetPost = postsOfComments.find(({ _id }) => _id === postId);
                                if (targetPost && targetPost.comments && targetPost.comments.length) {
                                    const _comments = commentsOnPost.map(commentInfo => {
                                        const { authorId, commentsByAuthor } = commentInfo;
                                        console.log({
                                            commentAuthors,
                                            authorId
                                        })
                                        const commentAuthor = commentAuthors.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                        console.log('commentAuthor: ', commentAuthor);
                                        if (commentAuthor) {
                                            const _commentsByAuthor = commentsByAuthor.map(commentByAuthor => {
                                                console.log(commentByAuthor.id);
                                                const targetComment = targetPost.comments.find(({ commentId }) => commentId === commentByAuthor.id);
                                                console.log('targetComment: ', targetComment);
                                                if (targetComment) {
                                                    console.log('what is upppp')
                                                    const timeElapsedText = _getTimeElapsedText(targetComment.createdAt);
                                                    // CU = current user
                                                    const isPostByCU = publishedDrafts.includes(postId);
                                                    const notificationText = isPostByCU ? `${commentAuthor.username} commented on your post ` : `${commentAuthor.username} commented on a post that you've commented on`;

                                                    return {
                                                        ...commentByAuthor,
                                                        timeElapsedText,
                                                        notificationText,
                                                        userIcon: commentAuthor.iconPath,
                                                        createdAt: targetComment.createdAt.miliSeconds
                                                    }
                                                }

                                                return commentAuthor;
                                            });

                                            return {
                                                ...commentInfo,
                                                commentsByAuthor: _commentsByAuthor
                                            }
                                        };

                                        return commentInfo;
                                    });

                                    return {
                                        ...post,
                                        comments: _comments
                                    }
                                } else {
                                    //add the post to an array and store it into notificationsToDel, will implement logic later
                                }

                                return post;
                            });
                            if (notificationsToDel) {
                                // WILL REFACTOR LATER


                                // response.json({ replies: _notifications })
                            } else {
                                response.json(commentNotifications)
                            }
                        })
                    });
                } else if (willGetComments) {
                    response.json({ isEmpty: true })
                }

                if (willGetPostsFromFollowing && newPostsFromFollowing && newPostsFromFollowing.length) {
                    const authorIdsOfPosts = newPostsFromFollowing.map(({ authorId }) => authorId);
                    let postIds = [];
                    newPostsFromFollowing.forEach(({ newPostIds }) => {
                        newPostIds.forEach(({ postId }) => {
                            !postIds.includes(postId) && postIds.push(postId);
                        })
                    })
                    console.log('postIds, willGetPostsFromFollowing: ', postIds);
                    User.find(
                        { _id: { $in: authorIdsOfPosts } },
                        { username: 1, iconPath: 1 },
                        error => {
                            if (error) {
                                console.error('An error has occurred in getting authors of posts')
                            } else {
                                console.log('No error has occurred in getting authors of posts.')
                            }
                        }
                    ).then(authorsOfPosts => {
                        BlogPost.find(
                            { _id: { $in: postIds } },
                            { title: 1, publicationDate: 1 },
                            error => {
                                if (error) {
                                    console.error('An error has occurred in getting posts.')
                                } else {
                                    console.log('No error has occurred in getting posts.')
                                }
                            }
                        ).then(newPosts => {
                            const _newPosts = newPostsFromFollowing.map(post => {
                                const { authorId, newPostIds } = post;
                                const author = authorsOfPosts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                // check if the author still exist 
                                if (author) {
                                    const _newPostIds = newPostIds.map(newPost => {
                                        const targetPost = newPosts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(newPost.postId));
                                        // check if the post still exist
                                        if (targetPost) {
                                            const { publicationDate, title } = targetPost;
                                            const timeElapsedText = _getTimeElapsedText(publicationDate);

                                            return {
                                                ...newPost,
                                                timeElapsedText,
                                                title,
                                                userIcon: author.iconPath,
                                                notificationText: `${author.username} posted a new article titled: `,
                                                createdAt: publicationDate.miliSeconds,
                                            }
                                        };

                                        return newPost
                                    });

                                    return {
                                        ...post,
                                        // CHANGE 'newPostIds' to 'newPosts'
                                        authorUsername: author.username,
                                        newPostIds: _newPostIds
                                    }
                                }

                                return post;
                            });

                            response.json(_newPosts)
                        })
                    })
                } else if (willGetPostsFromFollowing) {
                    response.json({ isEmpty: true })
                };

                if (willGetNewFollowers && newFollowers && newFollowers.length) {
                    const newFollowersIds = followers.map(({ userId }) => userId);
                    User.find({ _id: { $in: newFollowersIds } }, { username: 1, iconPath: 1 })
                        .then(users => {
                            const _newFollowers = newFollowers.map(follower => {
                                const user = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(follower.userId));
                                if (user) {
                                    const { wasFollowedAt } = followers.find(({ userId }) => userId === follower.userId);
                                    const timeElapsedText = _getTimeElapsedText(wasFollowedAt);

                                    return {
                                        ...follower,
                                        timeElapsedText,
                                        userIcon: user.iconPath,
                                        notificationText: `${user.username} followed you.`,
                                        followedAt: wasFollowedAt
                                    }
                                }

                                return follower;
                            });

                            response.json(_newFollowers);
                        });
                } else if (willGetNewFollowers) {
                    response.json({ isEmpty: true });
                }



            } else {
                response.json({ isEmpty: true });
            }


        })

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
