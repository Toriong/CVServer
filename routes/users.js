const { getTime, computeTimeElapsed, getTimeElapsedText, convertToStandardTime } = require("../functions/getTime");
const { getWordCount } = require('../functions/getWordCount');
const { getPostTags, getTextPreview } = require("../functions/blogPostsFns/blogPostFns");
const { v4: uuidv4 } = require('uuid');
const { insertNewLike } = require("../functions/insertNewLike");
const { sortListNamesByCreation } = require("../functions/sortListNamesByCreation");
const express = require('express');
const multer = require('multer');
const User = require("../models/user");
const BlogPost = require('../models/blogPost');
const Tag = require("../models/tag");
const fs = require('fs');
const router = express.Router();
const path = require('path');
const moment = require('moment');
// what does he do?
const he = require('he');





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
    console.log('hello there meng: ',)
    const { name, data, userId, username, listName, isPostPresent, isCommentAuthorPresent, notifyUserId } = request.body;
    // console.log('name status: ', name === 'checkDeletedLikedActivities')
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
        const { timeOfLastEdit, draftUpdated } = data;
        // console.log("request.body: ", request.body);
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
                        [`roughDrafts.$.${field}`]: draftUpdated[field],
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
                    console.log('draft was updated with tags, numsAffected: ', data);
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
                $pull: { roughDrafts: { _id: draftId } }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error("error message: ", error);
                } else {
                    console.log('Draft has been deleted, numsAffected: ', numsAffected);
                    response.sendStatus(200);
                }
            }
        );
        console.log("draft has been deleted")
    } else if (name === "postDraft") {
        // how to check if a value is present in the database?
        console.log("check if draft is ok to be published")
        User.find({
            _id: userId
        }).then(user => {
            const { _id: draftId, subtitle: subtitleFromClient, imgUrl: imgUrlFromClient, title: titleFromClient, body: bodyFromClient, tags: tagsFromClient } = data;
            const drafts = user[0].roughDrafts;
            const draftInDB = drafts.find(({ _id: _draftId }) => _draftId === draftId);
            const { _id, subtitle: subtitleInDb, imgUrl: imgUrlInDb, title: draftInDbTitle, body: draftInDbBody, tags: draftInDbTags } = draftInDB;
            const isTitleSame = draftInDbTitle === titleFromClient;
            const isBodySame = bodyFromClient === draftInDbBody;
            console.log({ tagsFromClient })
            const areTagsSame = JSON.stringify(draftInDbTags) === JSON.stringify(tagsFromClient);
            const wasNoSubtitleChosen = (subtitleFromClient === undefined) && (subtitleInDb === '' || subtitleInDb === undefined)
            const isSubtitleSame = wasNoSubtitleChosen ? undefined : subtitleFromClient === subtitleInDb;
            const wasNoImageChosen = (imgUrlInDb === undefined) && (imgUrlFromClient === undefined);
            const isImgUrlSame = wasNoImageChosen ? undefined : imgUrlInDb === imgUrlFromClient;
            console.log({
                isTitleSame,
                isBodySame,
                areTagsSame,
                wasNoImageChosen,
                isImgUrlSame,
                wasNoSubtitleChosen,
                isSubtitleSame,
            })
            if ((isTitleSame && isBodySame && areTagsSame) && (((!wasNoImageChosen && isImgUrlSame) && (!wasNoSubtitleChosen && isSubtitleSame)) || (wasNoImageChosen && (!wasNoSubtitleChosen && isSubtitleSame)) || (wasNoImageChosen && wasNoSubtitleChosen) || ((!wasNoImageChosen && isImgUrlSame) && wasNoSubtitleChosen))) {
                console.log('pass')
                User.updateOne(
                    { _id: userId },
                    {
                        $pull: { roughDrafts: { _id: draftId } },
                        $push: { publishedDrafts: draftId }
                    },
                    (error, numsAffected) => {
                        if (error) {
                            console.error("Error in updating user.roughDrafts: ", error);
                            response.sendStatus(404)
                        } else {
                            const editSelectedTags = selectedTags => selectedTags.map(tag => {
                                const { isNew, _id } = tag;
                                if (!isNew) {
                                    return { _id };
                                };

                                return tag;
                            });
                            console.log("User has been updated. numsAffected: ", numsAffected);
                            let newPost;
                            const { title, tags: _tags, body } = draftInDB;
                            const tags = editSelectedTags(_tags);
                            if (subtitleInDb && imgUrlInDb) {
                                console.log("I was executed")
                                newPost = new BlogPost({
                                    _id,
                                    title,
                                    authorId: userId,
                                    subtitle: subtitleInDb,
                                    imgUrl: imgUrlInDb,
                                    body,
                                    tags,
                                    publicationDate: getTime()
                                });
                            } else if (!subtitleInDb && imgUrlInDb) {
                                console.log("no subtitle present, publishing post")
                                newPost = new BlogPost({
                                    _id,
                                    title,
                                    authorId: userId,
                                    imgUrl: imgUrlInDb,
                                    body,
                                    tags,
                                    publicationDate: getTime()
                                });
                            } else if (subtitleInDb && !imgUrlInDb) {
                                console.log("no intro pic present, publishing post");
                                newPost = new BlogPost({
                                    _id,
                                    title,
                                    authorId: userId,
                                    subtitle: subtitleInDb,
                                    body,
                                    tags,
                                    publicationDate: getTime()
                                });
                            } else {
                                newPost = new BlogPost({
                                    _id,
                                    title,
                                    authorId: userId,
                                    body,
                                    tags,
                                    publicationDate: getTime()
                                });
                            };
                            newPost.save()
                            console.log("post published")
                            response.json({
                                message: "blog post successfully posted onto feed."
                            });
                        }
                    }
                );
            } else {
                console.error('Draft check Failed!');
                response.status(404).json('Draft check failed.');
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
            const likedPostsActivities = result?.activities?.likes?.likedPostIds?.length && result.activities.likes.likedPostIds;
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
                if (error) {
                    throw error;
                } else {
                    console.log(`User unliked a post, deleted activity. NumsAffectd: `, numsAffected);
                    response.status(200).json({ isLiked: false })
                }
            }
        )
    } else if (name === "userLikedComment") {
        // CASE: user unlikes a comment, deletes the comment from 
        const { postId, commentId } = data;
        User.findOne({ _id: userId }, { "activities.likes.comments": 1, _id: 0, "activitiesDeleted.likes": 1 }).then(result => {
            console.log("result: ", result);
            const likedCommentsActivity = result?.activities?.likes?.comments?.length && result.activities.likes.comments
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
    } else if (name === "followBtnPressed") {
        // NOTIFY THE USER BEING FOLLOWED HERE
        const { targetUserId, signedInUserId, followedUserAt } = data;
        console.log('dta ', data);
        if (followedUserAt) {
            User.updateOne({ _id: signedInUserId },
                {
                    $push:
                    {
                        "activities.following": { userId: targetUserId, followedUserAt }
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
            User.updateOne({ _id: targetUserId },
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
        } else {
            console.log('request.body: ', request.body);
            User.updateOne({ _id: signedInUserId },
                {
                    $pull:
                    {
                        "activities.following": { userId: targetUserId }
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
            User.updateOne({ _id: targetUserId },
                {
                    $pull:
                    {
                        followers: { userId: signedInUserId },
                        'notifications.newFollowers': { userId: signedInUserId }
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error(`An error has occurred in deleting user as a follower: `, error)
                    } else {
                        console.log(`User was unFollowed. numsAffected: `, numsAffected)
                        response.json("User was unFollowed and new following notification was deleted.")
                    }
                }
            );
        }

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
                        [`readingLists.${title}.createdAt`]: listCreatedAt,
                        [`readingLists.${title}._id`]: uuidv4()
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
        const { editedListName, description, isPrivate, editedAt } = data;
        if (description) {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        [`readingLists.${listName}.description`]: description,
                        [`readingLists.${listName}.editedAt`]: editedAt
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
                        [`readingLists.${listName}.isPrivate`]: isPrivate,
                        [`readingLists.${listName}.editedAt`]: editedAt

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
        if (editedListName) {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        [`readingLists.${listName}.editedAt`]: editedAt,
                    },
                    $push:
                    {
                        [`readingLists.${listName}.previousNames`]: { id: uuidv4(), oldName: listName, newName: editedListName, timeOfChange: editedAt },
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in updating reading list of user has occurred: ', error);
                    } else {
                        console.log('Reading list has been updated. Previous name has been saved. Will change the name of the list. NumsAffected: ', numsAffected);
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
                                    console.log('Reading list has been updated. Name has been changed. numsAffected: ', numsAffected);
                                }
                            }
                        );
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
                        notifyUserOfNewReply(newReplyNotification, notifyUserId);
                    }
                })
            })
    } else if (name === 'commentNotifications') {
        console.log("request.body: ", request.body)
        const { userIds } = request.body;
        const { postId, commentId } = data;
        // const isOneUserId = userIds.constructor !== Array;
        // MAIN GOAL: when the current uƒser leaves a comment on a post, notify the following users:
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
                    // response.json('Reply notification for author of reply was deleted.')
                }
            }
        );
        response.sendStatus(200);
    } else if (name === 'commentLikeNotification') {
        const { notifyUserId } = request.body;
        const { postId, commentId, userIdOfLike } = data;
        const newCommentNotification = {
            postId,
            comments: [{ commentId, userIdsOfLikes: [{ userId: userIdOfLike, isMarkedRead: false }] }]
        };

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
        response.sendStatus(200)
    } else if (name === 'postLikeNotification') {
        // GOAL: check if the there are post likes present for the current post that was liked 
        const { notifyUserId } = request.body;
        const { postId, userIdOfLike } = data;
        const newPostLikeNotification = {
            postId,
            userIdsOfLikes: [{ userId: userIdOfLike, isMarkedRead: false }]
        }
        console.log('request.body: ', request.body);
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
                    response.sendStatus(200);
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
    } else if (name === 'markAllAsReadNotifications') {
        User.findOne({ _id: userId }, { _id: 0, notifications: 1 }).then(result => {
            if (result.notifications) {
                const { notifications } = result;
                let _notifications;
                Object.keys(notifications).forEach(notificationField => {
                    if (notificationField === 'comments') {
                        const commentsUpdated = notifications['comments'].map(post => {
                            //GOAL: mark the COMMENT notifications as true 
                            const _comments = post.comments.map(author => {
                                const _commentsByAuthor = author.commentsByAuthor.map(comment => {
                                    return {
                                        ...comment,
                                        isMarkedRead: true
                                    }
                                });

                                return {
                                    ...author,
                                    commentsByAuthor: _commentsByAuthor
                                }
                            });

                            return {
                                ...post,
                                comments: _comments
                            }
                        });
                        _notifications = _notifications ? { ..._notifications, comments: commentsUpdated } : { comments: commentsUpdated };
                    } else if (notificationField === 'newFollowers') {
                        const _newFollowers = notifications['newFollowers'].map(follower => {
                            return {
                                ...follower,
                                isMarkedRead: true
                            }
                        });
                        _notifications = _notifications ? { ..._notifications, newFollowers: _newFollowers } : { newFollowers: _newFollowers };
                    } else if (notificationField === 'replies') {
                        // GOAL: mark the reply notification as true 
                        const _replies = notifications['replies'].map(post => {
                            const _repliesInfo = post.repliesInfo.map(replyInfo => {
                                const _commentsRepliedTo = replyInfo.commentsRepliedTo.map(comment => {
                                    const _replies = comment.replies.map(reply => {
                                        const _replyIds = reply.replyIds.map(replyId => {
                                            return {
                                                ...replyId,
                                                isMarkedRead: true
                                            };
                                        });

                                        return {
                                            ...reply,
                                            replyIds: _replyIds
                                        };
                                    });

                                    return {
                                        ...comment,
                                        replies: _replies
                                    }
                                });

                                return {
                                    ...replyInfo,
                                    commentsRepliedTo: _commentsRepliedTo
                                }
                            });

                            return {
                                ...post,
                                repliesInfo: _repliesInfo
                            }
                        });
                        _notifications = _notifications ? { ..._notifications, replies: _replies } : { replies: _replies };
                    } else if (notificationField === 'likes') {
                        // GOAL: access the replies field of the like object and change every 'isMarkedRead' field to true 
                        const likes = notifications[notificationField];
                        Object.keys(likes).forEach(likeField => {
                            if (likeField === 'posts') {
                                const _posts = likes['posts'].map(post => {
                                    if (post.userIdsOfLikes.length) {
                                        const _userIdsOfLikes = post.userIdsOfLikes.map(user => {
                                            return {
                                                ...user,
                                                isMarkedRead: true
                                            }
                                        });

                                        return {
                                            ...post,
                                            userIdsOfLikes: _userIdsOfLikes
                                        }
                                    };

                                    return post
                                });

                                _notifications = _notifications ?
                                    {
                                        ..._notifications,
                                        likes:
                                            _notifications?.likes ?
                                                {
                                                    ..._notifications.likes,
                                                    posts: _posts
                                                }
                                                :
                                                {
                                                    posts: _posts
                                                }
                                    }
                                    :
                                    {
                                        likes: { posts: _posts }
                                    };
                            } else if (likeField === 'replies') {
                                const _replies = likes['replies'].map(post => {
                                    const _commentsRepliedTo = post.commentsRepliedTo.map(comment => {
                                        const _replies = comment.replies.map(reply => {
                                            if (reply.userIdsOfLikes.length) {
                                                const _userIdsOfLikes = reply.userIdsOfLikes.map(user => {
                                                    return {
                                                        ...user,
                                                        isMarkedRead: true
                                                    }
                                                });

                                                return {
                                                    ...reply,
                                                    userIdsOfLikes: _userIdsOfLikes
                                                };
                                            };

                                            return reply;
                                        });

                                        return {
                                            ...comment,
                                            replies: _replies
                                        }
                                    });

                                    return {
                                        ...post,
                                        commentsRepliedTo: _commentsRepliedTo
                                    }
                                });
                                _notifications = _notifications ?
                                    {
                                        ..._notifications,
                                        likes:
                                            _notifications?.likes ?
                                                {
                                                    ..._notifications.likes,
                                                    replies: _replies
                                                }
                                                :
                                                {
                                                    replies: _replies
                                                }
                                    }
                                    :
                                    {
                                        likes: { replies: _replies }
                                    };
                            } else if (likeField === 'comments') {
                                // GOAL: for all of the objects that is stored in the array of comments access the isMarkedRead field and store a true boolean 
                                const _comments = likes['comments'].map(post => {
                                    const _comments = post.comments.map(comment => {
                                        if (comment.userIdsOfLikes.length) {
                                            const _userIdsOfLikes = comment.userIdsOfLikes.map(user => {
                                                return {
                                                    ...user,
                                                    isMarkedRead: true
                                                }
                                            });

                                            return {
                                                ...comment,
                                                userIdsOfLikes: _userIdsOfLikes
                                            }
                                        };

                                        return comment;
                                    });

                                    return {
                                        ...post,
                                        comments: _comments
                                    }
                                });

                                _notifications = _notifications ?
                                    {
                                        ..._notifications,
                                        likes:
                                            _notifications?.likes ?
                                                {
                                                    ..._notifications.likes,
                                                    comments: _comments
                                                }
                                                :
                                                {
                                                    comments: _comments
                                                }
                                    }
                                    :
                                    {
                                        likes: { comments: _comments }
                                    };

                            }
                        })
                    } else if (notificationField === 'newPostsFromFollowing') {
                        const _newPostsFromFollowing = notifications[notificationField].map(author => {
                            const _newPostIds = author.newPostIds.map(post => {
                                return {
                                    ...post,
                                    isMarkedRead: true
                                }
                            });

                            return {
                                ...author,
                                newPostIds: _newPostIds
                            }
                        });

                        _notifications = _notifications ? { ..._notifications, newPostsFromFollowing: _newPostsFromFollowing } : { newPostsFromFollowing: _newPostsFromFollowing };
                    }
                });

                User.updateOne(
                    { _id: userId },
                    {
                        $set:
                        {
                            notifications: _notifications
                        }
                    },
                    (error, numsAffected) => {
                        if (error) {
                            console.error('An error has occurred in updating notifications of user: ', error);
                        } else {
                            console.log("User's notifications has been updated, numsAffected: ", numsAffected);
                            response.sendStatus(200);
                        }
                    }
                )
            }
        });
        // response.json("'markAllAsReadNotifications' package was received.")
    } else if (name === 'markedAsReadToggled') {
        // GOAL: marked the reply like as read 
        // the isMarkedRead field is change to true for that object
        // find the object that contains the userId that was sent to the server
        // if a reply id for each object in the array that is stored in the replies field matches with the reply id that was sent to the server, access the userIdsOfLikes for that object
        // loop through the replies field 
        // if the commentId matches with the commentId that was sent to the server, then access replies field for the object
        // loop through the commentsRepliedTo field
        // the commentsRepliedTo is accessed
        // the postId matches with the postId matches with the postId that was sent to the server
        // if the postId matches with the postId that was sent to the server, then for that object that contains the matching postId, access the commentsRepliedTo field 
        // loop through the array that is stored in replies
        console.log("request.body: ", request.body);
        const { postId, commentId, replyId, userIdOfNotification, type, commentAuthorId } = request.body;
        const { isRead } = data;

        if (type === 'isReplyLike') {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        'notifications.likes.replies.$[post].commentsRepliedTo.$[comment].replies.$[reply].userIdsOfLikes.$[user].isMarkedRead': isRead
                    }
                },
                {
                    arrayFilters: [{ 'post.postId': postId }, { 'comment.commentId': commentId }, { 'reply.replyId': replyId }, { 'user.userId': userIdOfNotification }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("An error has occurred in updating the 'read' status of a notification: ", error);
                    } else {
                        console.log("The reply like 'isMarkedRead' status has been updated, numsAffected: ", numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        } else if (type === 'isCommentLike') {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        'notifications.likes.comments.$[post].comments.$[comment].userIdsOfLikes.$[user].isMarkedRead': isRead
                    }
                },
                {
                    arrayFilters: [{ 'post.postId': postId }, { 'comment.commentId': commentId }, { 'user.userId': userIdOfNotification }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("An error has occurred in updating the 'isMarkedRead' status of a comment like notification: ", error);
                    } else {
                        console.log("The comment like 'isMarkedRead' status has been updated, numsAffected: ", numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        } else if (type === 'isPostLike') {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        'notifications.likes.posts.$[post].userIdsOfLikes.$[user].isMarkedRead': isRead
                    }
                },
                {
                    arrayFilters: [{ 'post.postId': postId }, { 'user.userId': userIdOfNotification }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("An error has occurred in updating the 'isMarkedRead' status of a post like notification: ", error);
                    } else {
                        console.log("The post like 'isMarkedRead' status has been updated, numsAffected: ", numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        } else if (type === 'isReplyNotify') {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        'notifications.replies.$[post].repliesInfo.$[commentAuthor].commentsRepliedTo.$[comment].replies.$[replyAuthor].replyIds.$[reply].isMarkedRead': isRead
                    }
                },
                {
                    arrayFilters: [{ 'post.postId': postId }, { 'commentAuthor.commentAuthorId': commentAuthorId }, { 'comment.id': commentId }, { 'replyAuthor.authorId': userIdOfNotification }, { 'reply.id': replyId }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("An error has occurred in updating the 'isMarkedRead' status of reply notification: ", error);
                    } else {
                        console.log("The reply notification 'isMarkedRead' status has been updated, numsAffected: ", numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        } else if (type === 'isCommentNotify') {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        'notifications.comments.$[post].comments.$[commentAuthor].commentsByAuthor.$[comment].isMarkedRead': isRead
                    }
                },
                {
                    arrayFilters: [{ 'post.postId': postId }, { 'commentAuthor.authorId': userIdOfNotification }, { 'comment.id': commentId }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("An error has occurred in updating the 'isMarkedRead' status of comment notification: ", error);
                    } else {
                        console.log("The comment notification 'isMarkedRead' status has been updated, numsAffected: ", numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        } else if (type === 'isPostFromFollowing') {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        'notifications.newPostsFromFollowing.$[author].newPostIds.$[post].isMarkedRead': isRead
                    }
                },
                {
                    arrayFilters: [{ 'author.authorId': userIdOfNotification }, { 'post.postId': postId }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("An error has occurred in updating the 'isMarkedRead' status of newPostFromFollowing notification: ", error);
                    } else {
                        console.log("The new post from following notification 'isMarkedRead' status has been updated, numsAffected: ", numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        } else if (type === 'isNewFollower') {
            User.updateOne(
                { _id: userId },
                {
                    $set:
                    {
                        'notifications.newFollowers.$[user].isMarkedRead': isRead
                    }
                },
                {
                    arrayFilters: [{ 'user.userId': userIdOfNotification }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("An error has occurred in updating the 'isMarkedRead' status of newPostFromFollowing notification: ", error);
                    } else {
                        console.log("The new post from following notification 'isMarkedRead' status has been updated, numsAffected: ", numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        }
    } else if (name === 'deleteNotification') {
        const { postId, commentId, replyId, userIdOfNotification, type, commentAuthorId } = request.body;

        if (type === 'isReplyNotify') {
            User.updateOne(
                { _id: userId },
                {
                    $pull:
                    {
                        'notifications.replies.$[postOfReply].repliesInfo.$[commentAuthorId].commentsRepliedTo.$[commentId].replies.$[replyAuthorId].replyIds': { id: replyId }
                    }
                },
                {
                    arrayFilters: [{ 'postOfReply.postId': postId }, { 'commentAuthorId.commentAuthorId': commentAuthorId }, { 'commentId.id': commentId }, { 'replyAuthorId.authorId': userIdOfNotification }],
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('An error has occurred in deleting the reply notification: ', error);
                    } else {
                        console.log('Reply notification was deleted. ', numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        } else if (type === 'isCommentNotify') {
            console.log('isCommentNotify, request.body: ', request.body)
            User.updateOne(
                { _id: userId },
                {
                    $pull:
                    {
                        'notifications.comments.$[post].comments.$[comment].commentsByAuthor': { id: commentId }
                    }
                },
                {
                    arrayFilters: [{ 'post.postId': postId }, { 'comment.authorId': userIdOfNotification }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('An error has occurred in deleting comment notification: ', error);
                    } else {
                        console.log('Comment notification was deleted, numsAffected: ', numsAffected);
                        response.sendStatus(200);
                    }
                }
            )
        } else if (type === 'isPostFromFollowing') {
            console.log('isPostFromFollowing, request.body: ', request.body)
            User.updateOne(
                { _id: userId },
                {
                    $pull:
                    {
                        'notifications.newPostsFromFollowing.$[post].newPostIds': { postId: postId }
                    }
                },
                {
                    arrayFilters: [{ 'post.authorId': userIdOfNotification }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error(`An error has occurred in deleting post notification: `, error);
                    } else {
                        console.log('Post notification was deleted, numsAffected', numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        } else if (type === 'isNewFollower') {
            console.log('isNewFollower, request.body: ', request.body)
            User.updateOne({ _id: userId },
                {
                    $pull:
                    {
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('An error has occurred in deleting newFollower notification')
                    } else {
                        console.log('newFollower notification was deleted: ', numsAffected);
                        response.sendStatus(200);
                    }
                }
            );
        }
    } else if (name === 'deleteActivity') {
        const addDeletedActivity = (field, userId, activityId) => {
            User.updateOne(
                { _id: userId },
                {
                    $push:
                    {
                        [`activitiesDeleted.${field}`]: activityId
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('An error has occurred in deleting post activity from user. ', error)
                    } else {
                        console.log(`An activity was deleted from ${field}`, numsAffected);
                    }
                }
            );
        }
        // GOAL: before deleting the activity, check if the activity still exist
        // for likes: check if the user actually still likes the comment, post, or reply
        console.log('package.body: ', request.body)
        const { postId, repliedToCommentId, likedItemId, isReplyLike, isCommentLike, isPostLike } = request.body;
        const { activityId, field } = data;
        const checkIfLiked = (likes, userId) => likes.map(({ userId: _userId }) => _userId).includes(userId)
        if (field === 'likes') {
            BlogPost.findOne({ _id: postId ?? likedItemId }, { comments: 1, userIdsOfLikes: 1 }).then(result => {
                if (result && (isReplyLike || isCommentLike)) {
                    const comment = result.comments.find(({ commentId }) => commentId === (repliedToCommentId ?? likedItemId));
                    if (comment && isReplyLike) {
                        const targetReply = comment.replies.find(({ replyId }) => replyId === likedItemId);
                        if (targetReply) {
                            const isLiked = targetReply.userIdsOfLikes.map(({ userId }) => userId).includes(userId);
                            isLiked ? addDeletedActivity(field, userId, activityId) : console.log('This reply is no longer liked by the user. Will not add the deleted activity to the activitiesDeleted field.')
                        } else {
                            console.log('Reply no longer exist. User info has not been modified.')
                        }
                    } else if (comment) {
                        const isLiked = comment.userIdsOfLikes.map(({ userId }) => userId).includes(userId);
                        isLiked ? addDeletedActivity(field, userId, activityId) : console.log('This comment is no longer liked by the user. Will not add the deleted activity to the activitiesDeleted field.')
                    } else {
                        console.log('Comment no longer exist. User info has not been modified.')
                    }
                } else if (result && isPostLike) {
                    checkIfLiked(result.userIdsOfLikes, userId) ? addDeletedActivity(field, userId, activityId) : console.log('This post is no longer liked by the user. Will not add the deleted activity to the activitiesDeleted field.')
                } else {
                    console.log('Post no longer exist.')
                }
            })
        } else if (field === 'following') {
            User.findOne({ _id: userId }, { "activities.following": 1, _id: 0 }).then(user => {
                console.log('user: ', user)
                const { following } = user.activities
                const isFollowingUser = following?.length && following.map(({ userId }) => userId).includes(activityId)
                isFollowingUser ? addDeletedActivity(field, userId, activityId) : console.log("The user is no longer being followed by the current user. Will not add the id of the user to deletedActivities.following");
            })
        } else if (field === 'posts') {
            // GOAL: check if the posts still exist
            // CASE 1: the post exist
            // GOAL: if the post exist, then deleted the post from tracking 
            BlogPost.findOne({ _id: postId }).countDocuments().then(isPresent => {
                console.log('isPresent: ', isPresent);
                isPresent ? addDeletedActivity(field, userId, activityId) : console.log('The post no longer exist. Will not add the id of the post to the deletedActivities.posts field.')
            })
        } else if (field === 'commentsAndReplies') {
            BlogPost.findOne({ _id: postId, 'comments.commentId': repliedToCommentId ?? activityId }, { comments: 1, _id: 0 }).then(result => {
                if (result && repliedToCommentId) {
                    console.log('hello world')
                    const targetComment = result.comments.find(({ commentId }) => commentId === repliedToCommentId);
                    if (targetComment) {
                        const targetReply = targetComment.replies.find(({ replyId: _replyId }) => activityId === _replyId);
                        targetReply ? addDeletedActivity(field, userId, activityId) : console.log("The reply doesn't exist, will not add id of reply to deletedActivities.commentsAndReplies.");
                    } else {
                        console.log("Comment doesn't exist, current user profile has not been modified.")
                    }
                } else if (result) {
                    addDeletedActivity(field, userId, activityId);
                } else {
                    console.log("Comment or post doesn't exist.");
                }
            })
        } else if (field === 'readingLists') {
            console.log('request.body: ', request.body);
            User.findOne({ _id: userId }, { readingLists: 1, _id: 0 }).then(result => {
                const { readingLists } = result;
                const readingListNames = Object.keys(readingLists)
                let isListPresent;
                for (let listName of readingListNames) {
                    if (readingLists[listName]._id === activityId) {
                        isListPresent = true;
                        break;
                    }
                };
                isListPresent ? addDeletedActivity(field, userId, activityId) : console.log('The list has been deleted. No modification to the account of the user has occurred.')
            })
        } else if (field === 'blockedUsers') {
            User.findOne({ _id: userId, 'blockedUsers.userId': activityId }).countDocuments().then(isPresent => {
                isPresent ? addDeletedActivity(field, userId, activityId) : console.log('The blocked user has been unblocked. The profile of the current user has not been modified.')
            })
        }
        response.sendStatus(200);
    } else if (name === 'checkActivityDeletionStatus') {
        console.log('checkActivityDeletionStatus', request.body);
        const { field } = request.body;
        const { activityId } = data;
        User.findOne({ _id: userId, [`activitiesDeleted.${field}`]: { $in: [activityId] } }).countDocuments().then(isPresent => {
            if (isPresent) {
                // GOAL: delete the activity id from its field
                User.updateOne(
                    { _id: userId },
                    {
                        $pull:
                        {
                            [`activitiesDeleted.${field}`]: activityId
                        }
                    },
                    (error, numsAffected) => {
                        if (error) console.error("An error has occurred in deleting the activity id from the 'activitiesDeleted' field: ", error);
                        else {
                            console.log('Type: ', field);
                            console.log('Activity id was deleted from the array stored in the activitiesDeleted field. Now tracking activity, numsAffected: ', numsAffected);
                            response.sendStatus(200)
                        }
                    }
                )
            } else {
                console.log('User has not deleted the activity in the past. User info has not been modified.');
                response.sendStatus(200);
            }
        })
    } else if (name === 'reTrackActivity') {
        const { field } = request.body;
        const { activityId } = data;
        const pullIdFromActivitiesDel = (activityId, field, userId) => {
            User.updateOne(
                { _id: userId },
                {
                    $pull:
                    {
                        [`activitiesDeleted.${field}`]: activityId
                    }
                },
                (error, numsAffected) => {
                    if (error) console.error("An error has occurred in deleting the activity id from the 'activitiesDeleted' field: ", error);
                    else {
                        console.log('Type: ', field);
                        console.log('Activity id was deleted from the array stored in the activitiesDeleted field. Now tracking activity, numsAffected: ', numsAffected);
                        response.sendStatus(200)
                    }
                }
            )
        };
        pullIdFromActivitiesDel(activityId, field, userId);
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
    // how is storage executed during run time?
    storage: postIntroPicStorage,
    limits: {
        fileSize: 100_000_000
    },
    fileFilter(req, file, cb) {
        cb(null, true);
    }
});


// what is the 'single' method doing in
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

// user presses on the previous names button
// send a get request to get the previous names from the db
// the previous name is received 




router.route("/users/:package").get((request, response) => {
    const package = JSON.parse(request.params.package);
    const { password: passwordAttempt, name, userId, username } = package;
    if (name === "signInAttempt") {
        console.log("user wants to sign in")
        User.findOne({ username: username }).then(user => {
            if (user?.password === passwordAttempt) {
                const { username, firstName, lastName, iconPath, _id, readingLists, topics, isUserNew, bio, socialMedia, blockedUsers, publishedDrafts, activities } = user;
                console.log('password matches user signed backed in.')
                console.log("user signed back in")
                const following = activities?.following;
                const defaultUserInfo = { username, firstName, lastName, iconPath, _id, isUserNew, bio };
                let user_;
                if (readingLists && Object.keys(readingLists).length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, readingLists } : { readingLists }
                }
                if (topics?.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, topics } : { topics }
                };
                if (socialMedia?.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, socialMedia } : { socialMedia }
                }
                if (blockedUsers?.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, blockedUsers } : { blockedUsers }
                }
                if (publishedDrafts?.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, publishedDrafts } : { publishedDrafts }
                };
                if (following?.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, following } : { following }
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
            Tag.find({}).then(tags => {
                const targetedDraft = result.roughDrafts.find(({ _id }) => _id === draftId);
                const _tags = targetedDraft.tags && getPostTags(targetedDraft.tags, tags);
                const _draftToEdit = _tags ? { ...targetedDraft, tags: _tags } : { ...targetedDraft };
                response.json(_draftToEdit);
            });
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
    } else if (name === 'getFollowersAndFollowing') {
        const searchQuery = username ? { username: username } : { _id: userId };
        User.findOne(searchQuery, { followers: 1, _id: 0, 'activities.following': 1 })
            .then(result => {
                if (result?.followers?.length || result?.activities?.following?.length) {
                    const { followers, activities } = result;
                    let user;
                    if (followers?.length) {
                        user = { followers };
                    }
                    if (activities?.following?.length) {
                        user = user ? { ...user, following: activities.following } : { following: activities.following };
                    };
                    response.json(user);
                } else {
                    response.json({ isEmpty: true })
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
        const { listName } = package;
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
        const { willGetReplies, willGetReplyLikes, willGetCommentLikes, willGetPostLikes, willGetComments, willGetPostsFromFollowing, willGetNewFollowers } = package;
        //  NOTES:
        // get all seven notifications and send them individual back to the client 
        // CASE#1: a user replies to another user on the current user's post
        // send a boolean value to the server that will determine what notification to get for the user


        // CASE#2: A user replies to the current user on some else's post



        // GOAL: GET ALL OF THE REPLY NOTIFICATIONS
        // CASE#1:
        User.findOne({ _id: userId }, { _id: 0, notifications: 1, publishedDrafts: 1, followers: 1, blockedUsers: 1 }).then(result => {
            const { publishedDrafts, notifications, followers, blockedUsers } = result;
            const blockedUserIds = blockedUsers && blockedUsers.map(({ userId }) => userId);
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
                    ).then(postsOfReplies => {
                        const _infoOfAuthors = postsOfReplies.map(({ authorId }) => authorId);
                        authorIds = [...authorIds, ..._infoOfAuthors];
                        authorIds = [...new Set(authorIds)];
                        authorIds = blockedUserIds ? authorIds.filter(userId => !blockedUserIds.includes(userId)) : authorIds;
                        User.find(
                            { _id: authorIds },
                            { username: 1, iconPath: 1, publishedDrafts: 1 },
                            error => {
                                if (error) {
                                    console.error('An error has occurred in getting the user info of the author of replies');
                                } else {
                                    console.log('No error has occurred in getting the user info of the author of replies.')
                                }
                            }
                        ).then(infoOfAuthors => {
                            let notificationsToDel;
                            let replies_;
                            if (infoOfAuthors?.length && postsOfReplies?.length) {
                                replies_ = replies.map(reply => {
                                    const { postId, repliesInfo } = reply;
                                    const targetPost = postsOfReplies.find(({ _id }) => _id === postId);
                                    // GOAL: get the username of the author of the post 
                                    const postAuthor = infoOfAuthors.find(author => author.publishedDrafts && author.publishedDrafts.includes(postId));
                                    const isPostByCU = publishedDrafts.includes(postId);

                                    // if the comment doesn't exist, then that means the user deleted the comments
                                    // the comments doesn't exist
                                    // the user deleted the comments
                                    // if the user deleted the comments, then delete the reply notification 
                                    if ((postAuthor || isPostByCU) && !blockedUserIds.includes(postAuthor?._id) && targetPost && targetPost.comments && targetPost.comments.length) {
                                        const repliesInfo_ = repliesInfo.map(replyInfo => {
                                            // CASE1: THE COMMENT AUTHOR DOESN'T EXIST
                                            // CASE2: THE COMMENT DOESN'T EXIST
                                            const { commentsRepliedTo, commentAuthorId } = replyInfo;
                                            const doesCommentUserExist = infoOfAuthors.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(commentAuthorId)) !== undefined;
                                            const isCommentUserBlocked = (doesCommentUserExist && blockedUserIds?.length) && blockedUserIds.includes(commentAuthorId);
                                            if (doesCommentUserExist && !isCommentUserBlocked) {
                                                const _commentsRepliedTo = commentsRepliedTo.map(comment => {
                                                    const { id: _commentId, replies } = comment;
                                                    // does the comment on the post exist?
                                                    const commentOnPost = targetPost.comments.find(({ commentId }) => commentId === _commentId);
                                                    if (commentOnPost && commentOnPost.replies && commentOnPost.replies.length) {
                                                        const _replies = replies.map(replyInfo => {
                                                            const { authorId, replyIds } = replyInfo;
                                                            const replyAuthor = infoOfAuthors.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                                            const isReplyAuthorBlocked = (replyAuthor && blockedUserIds?.length) && blockedUserIds.includes(authorId);
                                                            if (replyAuthor && (replyIds && replyIds.length) && isReplyAuthorBlocked) {
                                                                const _replyIds = replyIds.map(reply => {
                                                                    // const { _reply, createdAt } = commentOnPost.replies.find(({ replyId }) => replyId === reply.id);
                                                                    const targetReply = commentOnPost.replies.find(({ replyId }) => replyId === reply.id);
                                                                    // MS = miliSeconds
                                                                    if (targetReply) {
                                                                        const { _reply, createdAt } = targetReply;
                                                                        const timeElapsedText = _getTimeElapsedText(createdAt);
                                                                        // CU = current user
                                                                        const isCommentByCU = commentAuthorId === userId;
                                                                        let notificationText;
                                                                        const { date, time, miliSeconds } = createdAt;
                                                                        const { username, iconPath } = replyAuthor;

                                                                        if (isPostByCU && isCommentByCU) {
                                                                            notificationText = "replied to your comment on your post "
                                                                        } else if (isPostByCU) {
                                                                            notificationText = "replied to a comment that you've replied to on your post "
                                                                        } else if (isCommentByCU) {
                                                                            notificationText = "replied to your comment on post ";
                                                                        } else {
                                                                            notificationText = "replied to a comment that you've replied to on post "
                                                                        };

                                                                        return {
                                                                            ...reply,
                                                                            //MS = miliSeconds
                                                                            userIcon: iconPath,
                                                                            username,
                                                                            createdAt: {
                                                                                date: date,
                                                                                time: time
                                                                            },
                                                                            timeElapsedText,
                                                                            notificationText,
                                                                            text: _reply,
                                                                            timeStampSort: miliSeconds
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
                                                };
                                            } else {
                                                // delete the author of the comment
                                                // notificationsToDel = addNotificationToDel(notificationsToDel, commentAuthorId, 'willDelCommentAuthors')
                                            };

                                            return replyInfo;
                                        });

                                        // CU = current user
                                        return isPostByCU ?
                                            {
                                                ...reply,
                                                repliesInfo: repliesInfo_,
                                                title: targetPost.title
                                            }
                                            :
                                            {
                                                ...reply,
                                                repliesInfo: repliesInfo_,
                                                postAuthorUN: postAuthor.username,
                                                title: targetPost.title
                                            };

                                    } else {
                                        // delete the whole entire post from the notifications field
                                        // notificationsToDel = addNotificationToDel(notificationsToDel, postId, 'willDelPosts')

                                    }

                                    return reply;

                                });
                            };
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
                            } else if (replies_) {
                                let _replyNotifications = [];
                                replies_.forEach(post => {
                                    const { postId, repliesInfo, title, postAuthorUN } = post;
                                    repliesInfo.forEach(replyInfo => {
                                        const { commentAuthorId, commentsRepliedTo } = replyInfo
                                        commentsRepliedTo.forEach(comment => {
                                            const { id: commentId, replies } = comment;
                                            replies.forEach(replyAuthor => {
                                                const { authorId, replyIds } = replyAuthor;
                                                replyIds.forEach(reply => {
                                                    // check if the notification is in existence by checking if the 'createdAt' field exist
                                                    if (reply.createdAt && postAuthorUN) {
                                                        const { id: replyId, ..._reply } = reply
                                                        _replyNotifications.push(
                                                            {
                                                                isReplyNotify: true,
                                                                postId,
                                                                title,
                                                                postAuthorUN,
                                                                commentAuthorId,
                                                                commentId: commentId,
                                                                replyId: replyId,
                                                                notification: {
                                                                    ..._reply,
                                                                    userId: authorId
                                                                }

                                                            }
                                                        );
                                                    } else if (reply.createdAt) {
                                                        const { id: replyId, ..._reply } = reply
                                                        _replyNotifications.push(
                                                            {
                                                                isReplyNotify: true,
                                                                postId,
                                                                title,
                                                                commentAuthorId,
                                                                replyId: replyId,
                                                                commentId: commentId,
                                                                notification: {
                                                                    ..._reply,
                                                                    userId: authorId
                                                                }

                                                            }
                                                        );
                                                    }
                                                })
                                            })
                                        })
                                    })
                                });
                                _replyNotifications.length ? response.json({ replies: _replyNotifications }) : response.json({ isEmpty: true });
                            } else {
                                response.json({ isEmpty: true });
                            }
                        })
                    });
                } else if (willGetReplies) {
                    response.json({ isEmpty: true })
                }

                if (willGetReplyLikes && (likes && likes.replies && likes.replies.length)) {
                    const { replies: replyLikes } = likes;
                    let userIds = [];
                    let postIds = [];
                    replyLikes.forEach(({ commentsRepliedTo, postId }) => {
                        !postIds.includes(postId) && postIds.push(postId);
                        commentsRepliedTo.forEach(({ replies }) => {
                            replies.forEach(({ userIdsOfLikes }) => {
                                if (userIdsOfLikes && userIdsOfLikes.length) {
                                    userIdsOfLikes.forEach(({ userId }) => {
                                        !userIds.includes(userId) && userIds.push(userId);
                                    });
                                }
                            })
                        })
                    });

                    BlogPost.find(
                        { _id: { $in: postIds } },
                        { comments: 1, title: 1, authorId: 1 },
                        error => {
                            if (error) {
                                console.error("THE ERROR YOO: ", error);
                            }
                        }
                    ).then(targetPosts => {
                        const postAuthors = targetPosts.map(({ authorId }) => authorId);
                        userIds = [...userIds, ...postAuthors];
                        userIds = [...new Set(userIds)];
                        userIds = blockedUserIds?.length ? userIds.filter(userId => !blockedUserIds.includes(userId)) : userIds;
                        User.find(
                            { _id: { $in: userIds } },
                            { username: 1, iconPath: 1, publishedDrafts: 1 },
                            error => {
                                if (error) {
                                    console.error('An error has occurred in getting the users of the reply likes');
                                } else {
                                    console.log('No error has occurred in getting the users of the reply likes.')
                                }
                            }
                        ).then(users => {
                            let delNotifications = [];
                            const _replyLikes = replyLikes.map(replyLike => {
                                const { postId, commentsRepliedTo } = replyLike;
                                const targetPost = targetPosts.find(({ _id }) => _id === postId);
                                const postAuthor = users.find(user => user.publishedDrafts && user.publishedDrafts.includes(postId));
                                const isPostByCU = publishedDrafts.includes(postId);
                                const isPostAuthorBlocked = blockedUserIds?.length && blockedUserIds.includes(postAuthor?._id);
                                // check if the post exist, and there are still comments on the post 
                                if ((postAuthor || isPostByCU) && targetPost && !isPostAuthorBlocked && targetPost?.comments?.length) {
                                    const _commentsRepliedTo = commentsRepliedTo.map(comment => {
                                        const { replies, commentId } = comment;
                                        // THE COMMENT WON'T EXIST WHEN THE USER DELETES THEIR ACCOUNT
                                        // check if the comment exist
                                        const targetComment = targetPost.comments.find(({ commentId: _commentId }) => _commentId === commentId);
                                        const isCommentAuthorBlocked = blockedUserIds?.length && blockedUserIds.includes(targetComment?.userId);
                                        if (targetComment && !isCommentAuthorBlocked) {
                                            const _replies = replies.map(reply => {
                                                const targetReply = targetComment.replies.find(({ replyId }) => replyId === reply.replyId);
                                                // check if the reply exist
                                                if (targetReply && reply?.userIdsOfLikes?.length) {
                                                    const _userIdsOfLikes = reply.userIdsOfLikes.map(user => {
                                                        const userOfLike = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(user.userId));
                                                        // check if the user still exist
                                                        const isUserOfLikeBlocked = (userOfLike && blockedUserIds?.length) && blockedUserIds.includes(user.userId);
                                                        if (userOfLike && !isUserOfLikeBlocked) {
                                                            const { likedAt } = targetReply.userIdsOfLikes.find(({ userId }) => userId === user.userId);
                                                            const timeElapsedText = _getTimeElapsedText(likedAt);
                                                            const { iconPath, username } = userOfLike;
                                                            // CU = current user
                                                            const notificationText = isPostByCU ? 'liked your reply on your post ' : 'liked your reply on post ';
                                                            const { date, time, miliSeconds } = likedAt

                                                            return {
                                                                ...user,
                                                                timeElapsedText,
                                                                notificationText,
                                                                userIcon: iconPath,
                                                                username: username,
                                                                likedAt: {
                                                                    date: date,
                                                                    time: time
                                                                },
                                                                timeStampSort: miliSeconds
                                                            };
                                                        } else {
                                                            // if the user doesn't exist, then find the user in the userIdsOfLikes and delete the userId from replies 
                                                            // delNotifications.push({ postId, commentId, replyId: reply.replyId, userId });
                                                        }

                                                        return user
                                                    });

                                                    return {
                                                        ...reply,
                                                        userIdsOfLikes: _userIdsOfLikes
                                                    }
                                                } else {
                                                    // if the reply doesn't exist, then delete the rely
                                                    // delNotifications.push({ postId, commentId, replyId: reply.replyId });

                                                };
                                                return reply
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

                                    // CU = current user
                                    return isPostByCU ?
                                        {
                                            ...replyLike,
                                            commentsRepliedTo: _commentsRepliedTo,
                                            title: targetPost.title
                                        }
                                        :
                                        {
                                            ...replyLike,
                                            commentsRepliedTo: _commentsRepliedTo,
                                            title: targetPost.title,
                                            // UN = username
                                            postAuthorUN: postAuthor.username
                                        };
                                } else {
                                    // if postId is not found im the blogPost collection, then delete the whole entire object by using the post id 
                                    // delNotifications.push({ postId });
                                };

                                return replyLike
                            });
                            if (delNotifications.length) {
                                //  GOAL: MAKE DELETION OF REPLY LIKES OCCUR AFTER THE FOLLOWING IS COMPLETE: THE notifications are displayed on the UI, the user's activities are displayed on the UI, the search feature is functional, the message feature is functional, the website is responsive    
                            } else {
                                let _replyLikesNotifications = [];
                                _replyLikes.forEach(post => {
                                    const { postId, title, commentsRepliedTo, postAuthorUN } = post;
                                    commentsRepliedTo.forEach(comment => {
                                        const { commentId, replies } = comment;
                                        replies.forEach(reply => {
                                            const { replyId, userIdsOfLikes } = reply;
                                            if (userIdsOfLikes?.length) {
                                                userIdsOfLikes.forEach(userOfLike => {
                                                    if (userOfLike.likedAt && postAuthorUN) {
                                                        _replyLikesNotifications.push(
                                                            {
                                                                isReplyLike: true,
                                                                postId,
                                                                title,
                                                                commentId,
                                                                replyId,
                                                                postAuthorUN,
                                                                notification: userOfLike
                                                            }
                                                        )
                                                    } else if (userOfLike.likedAt) {
                                                        _replyLikesNotifications.push(
                                                            {
                                                                isReplyLike: true,
                                                                postId,
                                                                title,
                                                                commentId,
                                                                replyId,
                                                                notification: userOfLike
                                                            }
                                                        )
                                                    }
                                                })
                                            }
                                        })
                                    })
                                });
                                _replyLikesNotifications.length ? response.json({ replyLikes: _replyLikesNotifications }) : response.json({ isEmpty: true })
                            }
                        })
                    })

                } else if (willGetReplyLikes) {
                    response.json({ isEmpty: true })
                }

                if (willGetCommentLikes && (likes && likes.comments && likes.comments.length)) {
                    let userIds = [];
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
                                !userIds.includes(userId) && userIds.push(userId);
                            })
                        })
                    });

                    BlogPost.find(
                        { _id: { $in: postIds } },
                        { comments: 1, title: 1, authorId: 1 }
                    ).then(targetPosts => {
                        const postAuthorIds = targetPosts.map(({ authorId }) => authorId);
                        userIds = [...userIds, ...postAuthorIds];
                        userIds = [...new Set(userIds)];
                        userIds = blockedUserIds?.length ? userIds.filter(userId => !blockedUserIds.includes(userId)) : userIds;
                        if (userIds.length) {
                            User.find(
                                { _id: userIds },
                                { username: 1, iconPath: 1, publishedDrafts: 1 }
                            ).then(users => {
                                let delNotifications;
                                if (targetPosts.length && users.length) {
                                    let _commentLikes = commentLikes.map(commentLike => {
                                        const { postId, comments } = commentLike;
                                        const targetPost = targetPosts.find(({ _id }) => _id === postId);
                                        const postAuthor = users.find(user => user.publishedDrafts.includes(postId));
                                        const isPostByCU = publishedDrafts.includes(postId);
                                        const isPostAuthorBlocked = blockedUserIds?.length && blockedUserIds.includes(postAuthor?._id);
                                        // check if the post exist, and there are still comments on the post 
                                        if ((postAuthor || isPostByCU) && targetPost && !isPostAuthorBlocked && targetPost?.comments?.length) {
                                            const _comments = comments.map(comment => {
                                                const { commentId, userIdsOfLikes } = comment;
                                                const targetComment = targetPost.comments.find(({ commentId: _commentId }) => commentId === _commentId);
                                                // check if the comment exist
                                                if (targetComment && userIdsOfLikes && userIdsOfLikes.length) {
                                                    const _userIdsOfLikes = userIdsOfLikes.map(user => {
                                                        const userOfLike = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(user.userId));
                                                        const isUserOfLikeBlocked = (userOfLike && blockedUserIds?.length) && blockedUserIds.includes(user.userId);
                                                        if (userOfLike && !isUserOfLikeBlocked) {
                                                            const { likedAt } = targetComment.userIdsOfLikes.find(({ userId }) => userId === user.userId);
                                                            const timeElapsedText = _getTimeElapsedText(likedAt);
                                                            // CU = current user 
                                                            const { username, iconPath } = userOfLike;
                                                            const notificationText = isPostByCU ? 'liked your comment on your post ' : 'liked your comment on post ';
                                                            const { date, time, miliSeconds } = likedAt

                                                            return {
                                                                ...user,
                                                                timeElapsedText,
                                                                notificationText,
                                                                userIcon: iconPath,
                                                                username,
                                                                likedAt: {
                                                                    date: date,
                                                                    time: time
                                                                },
                                                                timeStampSort: miliSeconds
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
                                            });

                                            return isPostByCU ?
                                                {
                                                    ...commentLike,
                                                    comments: _comments,
                                                    title: targetPost.title.trim()
                                                }
                                                :
                                                {
                                                    ...commentLike,
                                                    comments: _comments,
                                                    postAuthorUN: postAuthor.username,
                                                    title: targetPost.title.trim()
                                                };
                                        } else {
                                            // if postId is not found im the blogPost collection, then delete the whole entire object by using the post id 
                                            // delNotifications.push({ postId });
                                        };

                                        return commentLike;
                                    });

                                    if (delNotifications) {

                                        response.json({ commentLikes: _commentLikes });
                                    } else {
                                        // if the array is not empty, then send the below to the client 
                                        let _commentLikesNotifications = [];
                                        _commentLikes.forEach(post => {
                                            const { postId, title, comments, postAuthorUN } = post;
                                            comments.forEach(comment => {
                                                const { commentId, userIdsOfLikes } = comment;
                                                if (userIdsOfLikes?.length) {
                                                    userIdsOfLikes.forEach(userOfLike => {
                                                        if (userOfLike?.likedAt && postAuthorUN) {
                                                            _commentLikesNotifications.push(
                                                                {
                                                                    isCommentLike: true,
                                                                    postId,
                                                                    title,
                                                                    postAuthorUN,
                                                                    commentId,
                                                                    notification: userOfLike
                                                                }
                                                            )
                                                        } else if (userOfLike?.likedAt) {
                                                            _commentLikesNotifications.push(
                                                                {
                                                                    isCommentLike: true,
                                                                    postId,
                                                                    title,
                                                                    commentId,
                                                                    notification: userOfLike
                                                                }
                                                            )
                                                        };
                                                    })
                                                }
                                            })
                                        });

                                        _commentLikesNotifications.length ? response.json({ commentLikes: _commentLikesNotifications }) : response.json({ isEmpty: true })
                                    }
                                } else {
                                    response.json({ isEmpty: true })
                                }
                            })
                        } else {
                            response.json({ isEmpty: true })
                        }
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
                    });
                    userIdsOfPostLikes = blockedUserIds ? userIdsOfPostLikes.filter(userId => !blockedUserIds.includes(userId)) : userIdsOfPostLikes;

                    if (userIdsOfPostLikes.length) {
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
                            BlogPost.find(
                                { _id: { $in: postIds } },
                                { userIdsOfLikes: 1, title: 1 }
                            ).then(targetPosts => {
                                let delNotifications;
                                if (targetPosts.length && postLikesUsers.length) {
                                    const _postLikes = postLikes.map(postLike => {
                                        const { postId, userIdsOfLikes: userIdsLikeAlert } = postLike;
                                        const targetPost = targetPosts.find(({ _id }) => _id === postId);
                                        const isPostAuthorBlocked = blockedUserIds?.length && blockedUserIds.includes(targetPost?.authorId);
                                        // check if the target post has any likes and check if the userIdsLikeAlert has any users 
                                        if (targetPost?.userIdsOfLikes?.length && userIdsLikeAlert?.length && !isPostAuthorBlocked) {
                                            const { userIdsOfLikes, title } = targetPost;
                                            const _userIdsOfLikes = userIdsLikeAlert.map(user => {
                                                const userOfLike = postLikesUsers.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(user.userId));
                                                const isUserOfLikeBlocked = (userOfLike && blockedUserIds?.length) && blockedUserIds.includes(user.userId);
                                                if (userOfLike && !isUserOfLikeBlocked) {
                                                    const { likedAt } = userIdsOfLikes.find(({ userId }) => userId === user.userId);
                                                    const timeElapsedText = _getTimeElapsedText(likedAt);
                                                    const { date, time, miliSeconds } = likedAt
                                                    const { iconPath, username } = userOfLike
                                                    return {
                                                        ...user,
                                                        timeElapsedText,
                                                        userIcon: iconPath,
                                                        username,
                                                        notificationText: `liked your post `,
                                                        likedAt: {
                                                            date: date,
                                                            time: time
                                                        },
                                                        timeStampSort: miliSeconds
                                                    }
                                                }
                                            });

                                            return {
                                                ...postLike,
                                                userIdsOfLikes: _userIdsOfLikes,
                                                title: title
                                            }
                                        } else {
                                            // push the notification the will be deleted here
                                        }

                                        return postLike;
                                    });

                                    if (delNotifications) {

                                        response.json({ postLikes: _postLikes });
                                    } else {
                                        // if the array is not empty, then send the below to the client
                                        let _postLikeNotifications = [];
                                        _postLikes.forEach(post => {
                                            const { postId, title, userIdsOfLikes } = post;
                                            if (userIdsOfLikes.length) {
                                                userIdsOfLikes.forEach(userOfLike => { userOfLike.username && _postLikeNotifications.push({ isPostLike: true, postId, title, notification: userOfLike }); });
                                            };
                                        });
                                        _postLikeNotifications.length ? response.json({ postLikes: _postLikeNotifications }) : response.json({ isEmpty: true });
                                    }
                                } else {
                                    response.json({ isEmpty: true })
                                }
                            })
                        })
                    } else {
                        response.json({ isEmpty: true });
                    }

                } else if (willGetPostLikes) {
                    response.json({ isEmpty: true })
                }

                if (willGetComments && comments && comments.length) {
                    const postIdsOfComments = comments.map(({ postId }) => postId);
                    let userIds = [];
                    comments.forEach(({ comments }) => {
                        comments.forEach(({ authorId }) => { !userIds.includes(authorId) && userIds.push(authorId) });
                    });

                    BlogPost.find(
                        { _id: { $in: postIdsOfComments } },
                        { title: 1, comments: 1 }
                    ).then(postsOfComments => {
                        const postAuthorIds = postsOfComments.map(({ authorId }) => authorId);
                        userIds = [...userIds, ...postAuthorIds];
                        userIds = [...new Set(userIds)];
                        userIds = blockedUserIds?.length ? userIds.filter(userId => !blockedUserIds.includes(userId)) : userIds;
                        User.find(
                            { _id: { $in: userIds } },
                            { username: 1, iconPath: 1, publishedDrafts: 1, iconPath: 1 }
                        ).then(users => {
                            let notificationsToDel;
                            let commentNotifications;
                            if (users.length && postsOfComments.length) {
                                commentNotifications = comments.map(post => {
                                    const { postId, comments: commentsOnPost } = post;
                                    const targetPost = postsOfComments.find(({ _id }) => _id === postId);
                                    const postAuthor = users.find(user => user.publishedDrafts && user.publishedDrafts.includes(postId));
                                    const isPostAuthorBlocked = (postAuthor && blockedUserIds?.length) && blockedUserIds.includes(postAuthor._id);
                                    const isPostByCU = publishedDrafts.includes(postId);
                                    if ((postAuthor || isPostByCU) && targetPost && !isPostAuthorBlocked && targetPost?.comments?.length) {
                                        const _comments = commentsOnPost.map(commentInfo => {
                                            const { authorId, commentsByAuthor } = commentInfo;
                                            const commentAuthor = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                            const isCommentAuthorBlocked = (commentAuthor && blockedUserIds?.length) && blockedUserIds.includes(commentAuthor._id);
                                            if (!isCommentAuthorBlocked && commentAuthor) {
                                                const _commentsByAuthor = commentsByAuthor.map(commentByAuthor => {
                                                    const targetComment = targetPost.comments.find(({ commentId }) => commentId === commentByAuthor.id);
                                                    if (targetComment) {
                                                        const timeElapsedText = _getTimeElapsedText(targetComment.createdAt);
                                                        // CU = current user
                                                        const { username, iconPath } = commentAuthor;
                                                        const notificationText = isPostByCU ? 'commented on your post ' : "commented on a post that you've commented on";
                                                        const { date, miliSeconds, time } = targetComment.createdAt;
                                                        return {
                                                            ...commentByAuthor,
                                                            timeElapsedText,
                                                            notificationText,
                                                            text: targetComment.comment,
                                                            username,
                                                            userIcon: iconPath,
                                                            createdAt: {
                                                                date: date,
                                                                time: time
                                                            },
                                                            timeStampSort: miliSeconds
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

                                        return isPostByCU ?
                                            {
                                                ...post,
                                                comments: _comments,
                                                title: targetPost.title,
                                            }
                                            :
                                            {
                                                ...post,
                                                // UN = username
                                                postAuthorUN: postAuthor.username,
                                                comments: _comments,
                                                title: targetPost.title,
                                            };
                                    } else {
                                        //add the post to an array and store it into notificationsToDel, will implement logic later
                                    }

                                    return post;
                                });
                            }

                            if (notificationsToDel) {
                                // WILL REFACTOR LATER


                                // response.json({ replies: _notifications })
                            } else {
                                let _commentsNotifications = [];
                                commentNotifications && commentNotifications.forEach(post => {
                                    const { postId, comments, postAuthorUN, title } = post;
                                    comments.forEach(commentAuthor => {
                                        const { authorId, commentsByAuthor } = commentAuthor;
                                        if (commentsByAuthor.length) {
                                            commentsByAuthor.forEach(comment => {
                                                if (comment.createdAt && postAuthorUN) {
                                                    const { id: commentId, ..._comment } = comment;
                                                    _commentsNotifications.push(
                                                        {
                                                            isCommentNotify: true,
                                                            postId,
                                                            authorId,
                                                            postAuthorUN,
                                                            title,
                                                            commentId: commentId,
                                                            notification: {
                                                                ..._comment,
                                                                userId: authorId
                                                            }
                                                        }
                                                    )
                                                } else if (comment.createdAt) {
                                                    const { id: commentId, ..._comment } = comment;
                                                    _commentsNotifications.push(
                                                        {
                                                            isCommentNotify: true,
                                                            postId,
                                                            authorId,
                                                            title,
                                                            commentId: commentId,
                                                            notification: {
                                                                ..._comment,
                                                                userId: authorId
                                                            }
                                                        }
                                                    )
                                                }
                                            })
                                        };
                                    })
                                });
                                _commentsNotifications.length ? response.json({ comments: _commentsNotifications }) : response.json({ isEmpty: true })
                            }
                        })
                    });
                } else if (willGetComments) {
                    response.json({ isEmpty: true })
                }

                if (willGetPostsFromFollowing && newPostsFromFollowing?.length) {
                    let authorIdsOfPosts = newPostsFromFollowing.map(({ authorId }) => authorId);
                    authorIdsOfPosts = blockedUserIds?.length ? authorIdsOfPosts.filter(userId => !blockedUserIds.includes(userId)) : authorIdsOfPosts;
                    let postIds = [];
                    const _newPostsFromFollowing = blockedUserIds?.length ? newPostsFromFollowing.filter(({ authorId }) => !blockedUserIds.includes(authorId)) : newPostsFromFollowing;
                    _newPostsFromFollowing.forEach(({ newPostIds }) => {
                        newPostIds.forEach(({ postId }) => {
                            !postIds.includes(postId) && postIds.push(postId);
                        })
                    });
                    if (authorIdsOfPosts.length) {
                        User.find(
                            { _id: { $in: authorIdsOfPosts } },
                            { username: 1, iconPath: 1, blockedUsers: 1 },
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
                                if (newPosts.length && authorsOfPosts.length) {
                                    console.log('authorOfPosts: ', authorsOfPosts);
                                    const _newPosts = _newPostsFromFollowing.map(post => {
                                        const { authorId, newPostIds } = post;
                                        const author = authorsOfPosts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                        const authorBlockedUserIds = author?.blockedUsers?.length && author.blockedUsers.map(({ userId }) => userId);
                                        const isCurrentUserBlocked = authorBlockedUserIds?.length && authorBlockedUserIds.includes(userId);
                                        // check if the author still exist 
                                        if (author && !isCurrentUserBlocked) {
                                            const { username, iconPath } = author;
                                            const _newPostIds = newPostIds.map(newPost => {
                                                const targetPost = newPosts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(newPost.postId));
                                                // check if the post still exist
                                                if (targetPost) {
                                                    const { publicationDate, title } = targetPost;
                                                    const timeElapsedText = _getTimeElapsedText(publicationDate);
                                                    const { date, time, miliSeconds } = publicationDate;
                                                    return {
                                                        ...newPost,
                                                        timeElapsedText,
                                                        title,
                                                        notificationText: `posted a new article titled: `,
                                                        createdAt: {
                                                            date,
                                                            time
                                                        },
                                                        timeStampSort: miliSeconds
                                                    }
                                                };

                                                return newPost
                                            });

                                            return {
                                                ...post,
                                                // CHANGE 'newPostIds' to 'newPosts'
                                                authorUsername: username,
                                                userIcon: iconPath,
                                                newPostIds: _newPostIds
                                            }
                                        }

                                        return post;
                                    });
                                    let _followingNewPosts = [];
                                    _newPosts.forEach(newPost => {
                                        const { authorId, newPostIds, authorUsername, userIcon } = newPost;
                                        if (newPostIds?.length) {
                                            newPostIds.forEach(post => {
                                                const { postId, title, ..._post } = post;
                                                if (post.createdAt) {
                                                    _followingNewPosts.push(
                                                        {
                                                            isPostFromFollowing: true,
                                                            title,
                                                            postId,
                                                            postAuthorUN: authorUsername,
                                                            notification: {
                                                                ..._post,
                                                                userId: authorId,
                                                                userIcon: userIcon,
                                                            }
                                                        }
                                                    )
                                                }
                                            })
                                        }
                                    });
                                    _followingNewPosts.length ? response.json({ newPosts: _followingNewPosts }) : response.json({ isEmpty: true })
                                };
                            })
                        })
                    };
                } else if (willGetPostsFromFollowing) {
                    response.json({ isEmpty: true })
                };

                if (willGetNewFollowers && newFollowers && newFollowers.length) {
                    // followers = current followers of the user 
                    let newFollowersIds = followers.map(({ userId }) => userId);
                    newFollowersIds = blockedUserIds?.length ? newFollowersIds.filter(userId => !blockedUserIds.includes(userId)) : newFollowersIds;
                    let _newFollowers = blockedUserIds ? newFollowers.filter(({ userId }) => !blockedUserIds.includes(userId)) : newFollowers;

                    if (newFollowersIds.length && _newFollowers?.length) {
                        User.find({ _id: { $in: newFollowersIds } }, { username: 1, iconPath: 1 })
                            .then(users => {
                                if (users.length) {
                                    _newFollowers = newFollowers.map(follower => {
                                        const user = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(follower.userId));
                                        // check if the user still exists
                                        if (user) {
                                            const { wasFollowedAt } = followers.find(({ userId }) => userId === follower.userId);
                                            const timeElapsedText = _getTimeElapsedText(wasFollowedAt);
                                            const { date, time, miliSeconds } = wasFollowedAt;

                                            return {
                                                notification: {
                                                    ...follower,
                                                    timeElapsedText,
                                                    userIcon: user.iconPath,
                                                    username: user.username,
                                                    followedAt: {
                                                        date,
                                                        time
                                                    },
                                                    timeStampSort: miliSeconds
                                                },
                                                isNewFollower: true
                                            }
                                        }

                                        return follower
                                    });
                                    console.log({ _newFollowers });
                                    _newFollowers = _newFollowers.filter(({ isNewFollower }) => isNewFollower);
                                    _newFollowers.length ? response.json({ newFollowers: _newFollowers }) : response.json({ isEmpty: true })
                                } else {
                                    response.json({ isEmpty: true });
                                }
                            });
                    } else {
                        response.json({ isEmpty: true });
                    }
                } else if (willGetNewFollowers) {
                    response.json({ isEmpty: true });
                }



            } else {
                response.json({ isEmpty: true });
            }
        })
    } else if (name === 'getUserActivities') {
        const { willGetLikes, willGetRepliesAndComments, willGetPosts, willGetReadingLists, willGetBlockedUsers, willGetFollowing } = package;
        // GOAL: get the deleted post activities 
        User.findOne(
            { _id: userId },
            // postActivities = posts by the current user
            { activities: 1, _id: 0, publishedDrafts: 1, postsActivitiesNotToShow: 1, readingLists: 1, blockedUsers: 1, activitiesDeleted: 1 },
            error => {
                if (error) {
                    console.error('An error has occurred in getting current user profile info.')
                }
            }
        ).then(result => {

            const blockedUserIds = result?.blockedUsers ? result.blockedUsers.map(({ userId }) => userId) : [];
            const activitiesDeleted = result?.activitiesDeleted?.likes
            if (willGetLikes && (result?.activities?.likes?.replies || result?.activities?.likes?.comments || result?.activities?.likes?.posts)) {
                console.log('sup there')
                const { replies: likedReplies, comments: likedComments, likedPostIds } = result.activities.likes;
                let likes = [];
                // GOAL: go through each of the likedReplies, likedComments, and likedPostIds, and check if the user deleted the specific like from being tracked  
                let postIds = likedReplies?.length ? likedReplies.map(({ postIdOfReply }) => postIdOfReply) : [];
                likedComments?.length && likedComments.map(({ postIdOfComment }) => postIdOfComment).forEach(postId => { !postIds.includes(postId) && postIds.push(postId) });
                likedPostIds?.length && likedPostIds.forEach(postId => { !postIds.includes(postId) && postIds.push(postId) });
                BlogPost.find(
                    { $and: [{ _id: { $in: postIds }, authorId: { $nin: blockedUserIds } }] },
                    { comments: 1, _id: 1, title: 1, authorId: 1, userIdsOfLikes: 1 },
                    error => {
                        if (error) {
                            console.error('An error has occurred in getting the posts of liked replies.')
                        }
                    }
                ).then(posts => {
                    if (posts?.length) {
                        let userIds = posts.map(({ authorId }) => authorId);
                        posts.forEach(({ comments }) => {
                            comments.forEach(({ userId: commentUserId, replies }) => {
                                !userIds.includes(commentUserId) && userIds.push(commentUserId);
                                if (replies?.length) {
                                    replies.forEach(({ userId: replyUserId }) => {
                                        !userIds.includes(replyUserId) && userIds.push(replyUserId);
                                    })
                                }
                            })
                        })
                        userIds = blockedUserIds?.length ? userIds.filter(authorId => !blockedUserIds.includes(authorId)) : userIds;
                        if (userIds.length) {
                            User.find(
                                { _id: { $in: userIds } },
                                { username: 1 },
                                error => {
                                    if (error) {
                                        console.log('An error has occurred in getting the authors of post.')
                                    }
                                }
                            ).then(usernames => {
                                likedReplies && likedReplies.forEach(({ postIdOfReply, repliedToComments }) => {
                                    const targetPost = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postIdOfReply));
                                    if (targetPost) {
                                        // console.log('targetPost: ', targetPost);
                                        const { comments, title, _id: postId, authorId } = targetPost;
                                        const isPostByUser = authorId === userId;
                                        const author = !isPostByUser && usernames.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId))
                                        repliedToComments.forEach(({ id: _commentId, likedReplyIds }) => {
                                            const commentRepliedTo = comments?.length && comments.find(({ commentId }) => commentId === _commentId);
                                            const isCommentAuthorBlocked = (commentRepliedTo && blockedUserIds?.length) && blockedUserIds.includes(commentRepliedTo.userId);
                                            if (commentRepliedTo && !isCommentAuthorBlocked) {
                                                // destructure only when the commentRepliedTo is not undefined
                                                const { commentId, replies } = commentRepliedTo;
                                                likedReplyIds.forEach(_replyId => {
                                                    // DO A CHECK HERE IF THE user deleted the _replyId from being tracked
                                                    const isReplyNotTracked = activitiesDeleted?.includes(_replyId)
                                                    const reply = !isReplyNotTracked && replies.find(({ replyId }) => replyId === _replyId);
                                                    const isReplyByUser = !isReplyNotTracked && reply?.userId === userId
                                                    const isReplyAuthorBlocked = (!isReplyNotTracked && blockedUserIds?.length && reply) && blockedUserIds.includes(reply.userId);
                                                    if (reply && !isReplyAuthorBlocked && !isReplyNotTracked) {
                                                        const { replyId, userIdsOfLikes, userId: replyAuthorId, _reply: replyText } = reply;
                                                        const userOfLike = userIdsOfLikes?.length && userIdsOfLikes.find(({ userId: _userId }) => _userId === userId);
                                                        if (userOfLike) {
                                                            replyId === "4bfb4203-a805-4460-b560-d8875da719d5" && console.log('BURRITO, usernames: ', usernames);
                                                            const replyAuthor = !isReplyByUser && usernames.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(replyAuthorId));
                                                            replyId === "4bfb4203-a805-4460-b560-d8875da719d5" && console.log('BURRITO, replyAuthor: ', replyAuthor);
                                                            replyId === "4bfb4203-a805-4460-b560-d8875da719d5" && console.log('BURRITO: ', replyAuthor)
                                                            let uIText;
                                                            if (replyAuthor && isPostByUser) {
                                                                uIText = ` liked ${replyAuthor.username}'s reply on your post titled `
                                                            } else if (!replyAuthor && isPostByUser) {
                                                                uIText = ' liked your reply on your post titled ';
                                                            } else if (replyAuthor && !isPostByUser) {
                                                                uIText = ` liked ${replyAuthor.username}'s reply on post titled `
                                                            } else {
                                                                uIText = ` liked your reply on post titled `
                                                            }
                                                            const { date, time, miliSeconds } = userOfLike.likedAt
                                                            const _reply = replyText.split(" ").length > 50 ? getTextPreview(replyText) : replyText;
                                                            const likedReply = author ? { postId, authorUsername: author.username, title: `'${title}':`, _id: replyId, likedAt: { time, miliSeconds }, uIText, isReplyLike: true, _reply, titlePath: title, repliedToCommentId: commentId } : { postId, title: `${title}`, titlePath: title, _id: replyId, likedAt: { time, miliSeconds }, uIText, isReplyLike: true, _reply, repliedToCommentId: commentId };
                                                            likes = insertNewLike(date, likes, likedReply)
                                                        }
                                                    }
                                                })
                                            }
                                        })
                                    }
                                });

                                likedComments && likedComments.forEach(({ postIdOfComment, likedCommentIds }) => {
                                    const targetPost = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postIdOfComment));
                                    console.log({ targetPost })
                                    if (targetPost) {
                                        // console.log('targetPost: ', targetPost);
                                        const { comments, title, _id: postId, authorId: postAuthorId } = targetPost;
                                        const isPostByUser = postAuthorId === userId;
                                        const postAuthor = !isPostByUser && usernames.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postAuthorId));
                                        likedCommentIds.forEach(_commentId => {
                                            // GOAL: do a check here if the user deleted the comment from being tracked
                                            const isCommentNotTracked = activitiesDeleted?.includes(_commentId);
                                            const targetComment = !isCommentNotTracked && comments.find(({ commentId }) => commentId === _commentId);
                                            const isCommentByUser = !isCommentNotTracked && (targetComment?.userId === userId)
                                            const isCommentAuthorBlocked = (blockedUserIds?.length && !isCommentNotTracked && targetComment) && blockedUserIds.includes(targetComment.userId);
                                            console.log('rib eye')
                                            if (targetComment && !isCommentNotTracked && !isCommentAuthorBlocked) {
                                                console.log({ targetComment });
                                                const { userIdsOfLikes, userId: commentAuthorId, commentId, comment: commentText } = targetComment;
                                                const userOfLikedComment = userIdsOfLikes.find(({ userId: _userId }) => userId === _userId);
                                                if (userOfLikedComment) {
                                                    const commentAuthor = !isCommentByUser && usernames.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(commentAuthorId));
                                                    const { miliSeconds, time, date } = userOfLikedComment.likedAt;
                                                    let uIText;
                                                    if (isCommentByUser && isPostByUser) {
                                                        uIText = ` liked your own comment on your post titled `
                                                    } else if (isCommentByUser && !isPostByUser) {
                                                        uIText = ` liked your own comment on post titled `
                                                    } else if (!isCommentByUser && isPostByUser) {
                                                        uIText = ` liked ${commentAuthor.username}'s comment on your post titled `
                                                    } else {
                                                        uIText = ` liked ${commentAuthor.username}'s comment on post titled `
                                                    };
                                                    const _comment = commentText.split(" ").length > 50 ? getTextPreview(commentText) : commentText;
                                                    const likedComment = !(postAuthorId === userId) ? { postId, username: postAuthor.username, _id: commentId, uIText, title: `'${title}':`, isCommentLike: true, titlePath: title, likedAt: { time, miliSeconds }, _comment } : { postId, _id: commentId, uIText, title: `'${title}':`, titlePath: title, isCommentLike: true, likedAt: { time, miliSeconds }, _comment };
                                                    likes = insertNewLike(date, likes, likedComment);
                                                };
                                            };
                                        });
                                    };
                                });
                                likedPostIds && likedPostIds.forEach(postId => {
                                    // GOAL: do a check here if the user deleted the post from being tracked
                                    const isPostNotTracked = activitiesDeleted?.includes(postId);
                                    const targetPost = !isPostNotTracked && posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postId));
                                    const isPostByUser = !isPostNotTracked && (targetPost?.authorId === userId);
                                    const isPostAuthorBlocked = (blockedUserIds?.length && !isPostNotTracked && targetPost) && blockedUserIds.includes(targetPost.authorId);
                                    console.log('targetPost: ', targetPost);
                                    if (!isPostNotTracked && targetPost && !isPostAuthorBlocked) {
                                        console.log('wtf')
                                        const { title, authorId, userIdsOfLikes } = targetPost;
                                        const userOfLike = userIdsOfLikes.length && userIdsOfLikes.find(({ userId: _userId }) => _userId === userId);
                                        if (userOfLike) {
                                            // WHY DO I HAVE TO JSON STRINGIFY THE FIND
                                            const author = !isPostByUser && usernames.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId))
                                            const { time, date, miliSeconds } = userOfLike.likedAt;
                                            const uIText = isPostByUser ? ' liked your own post titled ' : ` liked ${author.username}'s post titled `
                                            const likedPost = { _id: postId, title: `'${title}'.`, authorUsername: author.username, titlePath: title, likedAt: { miliSeconds, time }, isLikes: true, uIText, isPostLike: true };
                                            likes = insertNewLike(date, likes, likedPost);
                                        }
                                    };
                                });
                                // GOAL: sort the likes according to time (from the latest to the oldest)
                                // brain dump:
                                // use the likedOn field as the determinate of the sort
                                // also sort out the activities for each activity of the day
                                // STEPS: 
                                console.log('likes, before: ', likes)
                                likes = likes.length && likes.sort(({ likedOn: likedOnA }, { likedOn: likedOnB }) => {
                                    if (likedOnA > likedOnB) return -1;
                                    if (likedOnA < likedOnB) return 1;
                                    return 0;
                                });
                                console.log('yo there: ', likes);
                                const sortDayActivities = likes => likes.map(like => {
                                    console.log('likes: ', likes);
                                    if (like.activities.length > 1) {
                                        // how is this descending order? 
                                        return {
                                            ...like,
                                            activities: like.activities.sort(({ likedAt: likedAtA }, { likedAt: likedAtB }) => likedAtB.miliSeconds - likedAtA.miliSeconds)
                                        }
                                    };

                                    return like;
                                });
                                likes = likes.length && sortDayActivities(likes);

                                // GOAL: sort the activities of each day from latest to oldest:
                                // BRAIN DUMP:
                                // go through each day activity, for each day activity, access the activities field, sort through that array according to the miliSeconds that is stored in the likedAt. Commence the sort only if the activities of that day exceeds one
                                likes?.length ? response.json(likes) : response.json({ isEmpty: true });

                            })
                        } else {
                            response.json({ isEmpty: true });
                        }
                    }
                })
            } else if (willGetLikes) {
                response.json({ isEmpty: true });
                // get the replies that were made by the current user
            } else if (willGetRepliesAndComments && (result?.activities?.replies || result?.activities?.comments)) {
                // GOAL: get both the replies and comments by the current
                // brain dump:
                // get all of the posts that the comments and the replies reside in
                // clear any duplicates
                const { replies: repliesByUser, comments: commentsByUser } = result.activities;
                let postIds = repliesByUser ? repliesByUser.map(({ postId }) => postId) : [];
                commentsByUser && commentsByUser.forEach(({ postIdOfComment }) => { !postIds.includes(postIdOfComment) && postIds.push(postIdOfComment) });

                let repliedToCommentIds = [];
                repliesByUser && repliesByUser.forEach(({ commentsRepliedTo }) => {
                    commentsRepliedTo.forEach(commentId => { repliedToCommentIds.push(commentId) });
                });


                BlogPost.find(
                    { $and: [{ _id: { $in: postIds }, authorId: { $nin: blockedUserIds } }] },
                    { title: 1, comments: 1, authorId: 1 },
                    error => {
                        if (error) {
                            console.error('An error has occurred in getting the post of replies by user.')
                        }
                    }
                ).then(posts => {
                    if (posts.length) {
                        let postIdsOfComments = commentsByUser.map(({ postIdOfComment }) => postIdOfComment);
                        postIdsOfComments = posts.filter(({ _id }) => postIdsOfComments.includes(_id));

                        // get the usernames of the comments that the user replied to and of the author of the post that the comment and the reply resides in.  
                        let userIds = posts.map(({ authorId }) => authorId).filter(_userId => _userId !== userId)
                        posts.forEach(({ comments }) => {
                            comments.forEach(({ commentId, userId: commentAuthorId }) => {
                                (repliedToCommentIds.includes(commentId) && !userIds.includes(commentAuthorId)) && userIds.push(commentAuthorId);
                            })
                        });
                        userIds = blockedUserIds?.length ? userIds.filter(userId => !blockedUserIds.includes(userId)) : userIds;

                        User.find(
                            { _id: { $in: userIds } },
                            { username: 1 }
                        ).then(usernames => {
                            const activitiesDeleted = result?.activitiesDeleted?.commentsAndReplies;
                            let datesOfActivities;
                            repliesByUser && repliesByUser.forEach(({ postId, commentsRepliedTo, deletedRepliesActivity }) => {
                                const targetPost = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postId));
                                if (targetPost) {
                                    const { comments, _id: postId, title, authorId: postAuthorId } = targetPost;
                                    if (comments.length) {
                                        commentsRepliedTo.forEach(_commentId => {
                                            const targetComment = comments.find(({ commentId }) => commentId === _commentId);
                                            const isCommentAuthorBlocked = (targetComment && blockedUserIds?.length) && blockedUserIds.includes(targetComment.userId)
                                            if (targetComment && !isCommentAuthorBlocked) {
                                                // GOAL: for all previous versions, put them into their object based on the date that they were created, and put all versions that were posted on that date into the field of versions. Each object that will be stored in 'previousVersions' will have the following structure: {publicationDate: 'the date of the publication', versions: [version: 'the text of the reply', postedAt: 'the time that the reply was posted at']} 
                                                const { commentId, replies, userId: commentAuthorId } = targetComment;
                                                const _repliesByUser = replies?.length && replies.filter(({ userId: replyAuthorId, replyId }) => (!activitiesDeleted?.includes(replyId) && (userId === replyAuthorId)));
                                                if (_repliesByUser?.length) {
                                                    _repliesByUser.forEach((reply => {
                                                        const { replyId, _reply: replyText, createdAt, previousReplies: _previousReplies, updatedAt } = reply;
                                                        const { date: replyPostedOn, time, miliSeconds } = createdAt;
                                                        if (!deletedRepliesActivity?.includes(replyId)) {
                                                            const postAuthor = (postAuthorId !== userId) && usernames.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postAuthorId));
                                                            const isCommentByUser = commentAuthorId === userId;
                                                            const commentAuthor = !isCommentByUser && usernames.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(commentAuthorId))
                                                            let uIText;
                                                            if (!postAuthor && isCommentByUser) {
                                                                uIText = ' replied to your comment on your post titled '
                                                            } else if (!postAuthor && !isCommentByUser) {
                                                                uIText = ` replied to ${commentAuthor.username}'s comment on your post titled `
                                                            } else if (postAuthor && isCommentByUser) {
                                                                uIText = ` replied to your comment on post titled `
                                                            } else {
                                                                uIText = ` replied to ${commentAuthor.username}'s comment on post titled `
                                                            }
                                                            const authorUsername = postAuthor?.username
                                                            let previousReplies;
                                                            if (_previousReplies?.length) {
                                                                _previousReplies.forEach(reply => {
                                                                    const { id, createdAt, text } = reply;
                                                                    const { date: editsPublishedOn, time } = createdAt;
                                                                    const doesDateExist = previousReplies && previousReplies.map(({ publishedOn }) => publishedOn).includes(editsPublishedOn);
                                                                    const version = { publishedAt: time, replyText: text, id }
                                                                    if (doesDateExist) {
                                                                        previousReplies = previousReplies.map(reply => {
                                                                            const { publishedOn: _editsPublishedOn, versions } = reply;
                                                                            if (_editsPublishedOn === editsPublishedOn) {
                                                                                return {
                                                                                    ...reply,
                                                                                    versions: [...versions, version]
                                                                                }
                                                                            };

                                                                            return reply;
                                                                        })
                                                                    } else {
                                                                        const replyPublishedDay = { publishedOn: editsPublishedOn, versions: [version] };
                                                                        previousReplies = previousReplies ? [...previousReplies, replyPublishedDay] : [replyPublishedDay]
                                                                    }
                                                                })
                                                            }
                                                            if (previousReplies) {
                                                                previousReplies = previousReplies.map(reply => {
                                                                    return {
                                                                        ...reply,
                                                                        versions: reply.versions.reverse()
                                                                    };
                                                                })
                                                            }
                                                            previousReplies = previousReplies ? previousReplies.reverse() : previousReplies;
                                                            // const editsPublishedAt = updatedAt?.time
                                                            const _reply = replyText.split(" ").length > 50 ? getTextPreview(replyText) : replyText;
                                                            const reply = { postId, title, authorUsername, repliedToCommentId: commentId, _id: replyId, uIText, _reply, publication: { time, miliSeconds }, previousVersions: previousReplies, editsPublishedAt: updatedAt };
                                                            const doesDateExist = datesOfActivities && datesOfActivities.map(replyOrComment => replyOrComment?.publicationDate).includes(replyPostedOn);
                                                            if (doesDateExist) {
                                                                console.log('datesOfActivities: ', datesOfActivities)
                                                                datesOfActivities = datesOfActivities.map(replyOrComment => {
                                                                    const { publicationDate: _replyPostedOn, activities } = replyOrComment;
                                                                    if (_replyPostedOn === replyPostedOn) {
                                                                        return {
                                                                            ...replyOrComment,
                                                                            activities: [...activities, reply]
                                                                        }
                                                                    };

                                                                    return replyOrComment
                                                                })
                                                            } else {
                                                                const replyActivity = postAuthor ? { publicationDate: replyPostedOn, activities: [reply], isCommentOrReply: true } : { publicationDate: replyPostedOn, activities: [reply], isCommentOrReply: true };
                                                                datesOfActivities = datesOfActivities ? [...datesOfActivities, replyActivity] : [replyActivity]
                                                            }
                                                        };
                                                    }))
                                                }
                                            }
                                        });
                                    }
                                };
                            });

                            const sortPreviousComments = previousComments => {
                                let _previousComments;
                                previousComments.forEach(comment => {
                                    const { id, createdAt, text } = comment;
                                    const { date: editsPublishedOn, time } = createdAt;
                                    const doesDateExist = _previousComments && _previousComments.map(({ publicationDate }) => publicationDate).includes(editsPublishedOn);
                                    const version = { publishedAt: time, commentText: text, id }
                                    if (doesDateExist) {
                                        _previousComments = _previousComments.map(comment => {
                                            const { publishedOn: _editsPublishedOn, versions } = comment;
                                            if (_editsPublishedOn === editsPublishedOn) {
                                                return {
                                                    ...comment,
                                                    versions: [...versions, version]
                                                }
                                            };

                                            return comment;
                                        })
                                    } else {
                                        const commentPublishedDay = { publishedOn: editsPublishedOn, versions: [version] };
                                        _previousComments = _previousComments ? [..._previousComments, commentPublishedDay] : [commentPublishedDay]
                                    }
                                });
                                _previousComments = _previousComments.map(comment => { return { ...comment, versions: comment.versions.reverse() } }).reverse();

                                return _previousComments;
                            }

                            commentsByUser && commentsByUser.forEach(({ postIdOfComment }) => {
                                const targetPost = postIdsOfComments.find(({ _id }) => _id === postIdOfComment);
                                if (targetPost) {
                                    // GOAL: get the following comment info {postId, username of the author of the post, comment text , comment id} and push it into the object that holds the date that it was published
                                    const { comments, authorId, _id: postId, title } = targetPost;
                                    const author = (authorId !== userId) && usernames.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                    const authorUsername = author?.username
                                    const commentsByUser = comments.filter(({ userId: commentAuthorId, commentId }) => (!activitiesDeleted?.includes(commentId) && (userId === commentAuthorId)));;
                                    if (commentsByUser.length) {
                                        commentsByUser.forEach(comment => {
                                            const { comment: commentText, createdAt, updatedAt, previousComments: _previousComments, commentId } = comment;
                                            const { date: commentPostedOn, time: creationTime, miliSeconds } = createdAt;
                                            console.log({ authorUsername })
                                            const uIText = authorUsername ? ` commented on ${authorUsername}'s post titled ` : ' commented on your post titled ';
                                            const previousComments = _previousComments && sortPreviousComments(_previousComments);
                                            // const editsPublishedAt = updatedAt;
                                            const _comment = commentText.split(' ').length > 50 ? getTextPreview(commentText) : commentText;
                                            const commentActivity = { postId, title, authorUsername, _comment, publication: { time: creationTime, miliSeconds }, previousVersions: previousComments, uIText, editsPublishedAt: updatedAt, _id: commentId };
                                            const doesDateExist = datesOfActivities && datesOfActivities.map(comment => comment?.publicationDate).includes(commentPostedOn);
                                            if (doesDateExist) {
                                                datesOfActivities = datesOfActivities.map(comment => {
                                                    const { publicationDate: _commentPostedOn, activities } = comment;
                                                    if (_commentPostedOn === commentPostedOn) {
                                                        return {
                                                            ...comment,
                                                            activities: [...activities, commentActivity]
                                                        }
                                                    };

                                                    return comment;
                                                })
                                            } else {
                                                const commentPublishedDay = { publicationDate: commentPostedOn, activities: [commentActivity], isCommentOrReply: true };
                                                datesOfActivities = datesOfActivities ? [...datesOfActivities, commentPublishedDay] : [commentPublishedDay];
                                            }
                                        })
                                    }
                                }
                            })

                            // GOAL: push the following data s
                            // CASE 1: the date already exist in the datesOfActivities
                            // CASE 2: the date doesn't exist in the datesOfActivities


                            // sort the dates (starting with the latest)
                            // datesOfActivities = datesOfActivities.sort(({ publicationDate: dateA }, { publicationDate: dateB }) => -(dateA.miliSeconds - dateB.miliSeconds));
                            datesOfActivities = datesOfActivities.sort(({ publicationDate: dateA }, { publicationDate: dateB }) => {
                                if (dateA > dateB) return -1;
                                if (dateA < dateB) return 1;
                                return 0;
                            });
                            // sort the activities by time (starting with the latest)
                            datesOfActivities = datesOfActivities.map(comment => {
                                if (comment.activities.length > 1) {
                                    return {
                                        ...comment,
                                        activities: comment.activities.sort(({ publication: publishedAtA }, { publication: publishedAtB }) => -(publishedAtA.miliSeconds - publishedAtB.miliSeconds))
                                    }
                                };

                                return comment
                            })


                            datesOfActivities ? response.json(datesOfActivities) : response.json({ isEmpty: true })
                        })
                    };
                })
            } else if (willGetRepliesAndComments) {
                response.json({ isEmpty: true })
                // get the comments that were liked by the current user
            } else if (willGetPosts && result?.publishedDrafts?.length) {
                const { publishedDrafts, activitiesDeleted } = result;
                const postIds = activitiesDeleted?.posts ? publishedDrafts.filter(draftId => !activitiesDeleted.posts.includes(draftId)) : publishedDrafts;

                BlogPost.find(
                    { _id: { $in: postIds } },
                    { publicationDate: 1, previousVersions: 1, editsPublishedAt: 1, title: 1, body: 1, imgUrl: 1, tags: 1, subtitle: 1 },
                    error => {
                        if (error) console.error('An error has occurred in getting published drafts of user.');
                    }
                ).then(posts => {
                    Tag.find({}).then(tags => {
                        // GOAL: get all of the info for the tags that were selected if the tags were the default tags on the site
                        const _posts = posts.map(post => {
                            const { _id: postId, previousVersions, body: postedBody, imgUrl, title, subtitle, tags: postTags, editsPublishedAt } = post;
                            const bodyHtmlStriped = postedBody.replace(/<[^>]+>/g, '');
                            const decodedBodyHtmlStriped = he.decode(bodyHtmlStriped);
                            const wordCount = getWordCount(decodedBodyHtmlStriped);
                            // let bodyPreview;
                            // if (wordCount > 50) {
                            //     bodyPreview = decodedBodyHtmlStriped.split(' ').slice(0, 45);
                            //     bodyPreview.splice(44, 1, `${bodyPreview[44]}...`);
                            //     bodyPreview = bodyPreview.join(' ');
                            // }
                            const bodyPreview = wordCount > 50 && getTextPreview(decodedBodyHtmlStriped)
                            // const isGreaterThan50Words = decodedBodyHtmlStriped.split(' ').length > 50;
                            if (previousVersions.length) {
                                const publishedVersion = { isPublished: true, title, subtitle, tags: postTags, imgUrl, wordCount, publicationDate: editsPublishedAt, body: postedBody };
                                let _previousVersions = [...previousVersions, publishedVersion];
                                _previousVersions = _previousVersions.map((versionA, index) => {
                                    const _tags = versionA.tags.map(tag => {
                                        const { _id: tagId, isNew } = tag;
                                        if (!isNew) {
                                            const _tag = tags.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(tagId));
                                            const { ...allTagInfo } = _tag;
                                            return {
                                                ...tag,
                                                topic: allTagInfo._doc.topic
                                            }
                                        };

                                        return tag;
                                    });
                                    const { title, body: versionABody, subtitle, tags: tagsA, imgUrl: imgUrlA } = versionA;
                                    const imgUrl = (imgUrlA && index === 0) && { path: imgUrlA };
                                    const bodyWordCountA = getWordCount(versionABody)
                                    if (index > 0) {
                                        const titleWordCountA = getWordCount(title);
                                        const subtitleWordCountA = subtitle && getWordCount(subtitle);
                                        const versionB = _previousVersions[index - 1];
                                        const { title: editedTitleB, body: editedBodyB, subtitle: editedSubtitleB, tags: tagsB, imgUrl: imgUrlB } = versionB;
                                        const didBodyContentChange = editedBodyB !== versionABody;
                                        const titleWordCountB = getWordCount(editedTitleB);
                                        const subtitleWordCountB = editedSubtitleB && getWordCount(editedSubtitleB)
                                        const bodyWordCountB = getWordCount(editedBodyB);
                                        const didTitleWordCountChange = (titleWordCountA !== titleWordCountB);
                                        const didTitleContentChange = title !== editedTitleB;
                                        const didBodyCountChange = bodyWordCountA !== bodyWordCountB;
                                        let subtitleStatus;
                                        let introPicStatus;
                                        if ((imgUrlB === undefined) && (imgUrlA === undefined)) {
                                            introPicStatus = 'introPicUnavailable'
                                        } else if ((imgUrlB === undefined) && imgUrlA) {
                                            introPicStatus = 'introPicAdded'
                                        } else if (imgUrlB && (imgUrlA === undefined)) {
                                            introPicStatus = 'introPicDel'
                                        } else if ((imgUrlB && imgUrlA) && (imgUrlB === imgUrlA)) {
                                            introPicStatus = 'sameIntroPic'
                                        } else if ((imgUrlB && imgUrlA) && (imgUrlB !== imgUrlA)) {
                                            introPicStatus = 'introPicUpdated'
                                        }
                                        const _imgUrl = { status: introPicStatus, path: imgUrlA }
                                        if ((editedSubtitleB === undefined) && (subtitle === undefined)) {
                                            subtitleStatus = 'subtitleUnavailable'
                                        } else if ((editedSubtitleB === undefined) && subtitle) {
                                            subtitleStatus = 'subtitleAdded';
                                        } else if (editedSubtitleB && (subtitle === undefined)) {
                                            subtitleStatus = 'subtitleDel'
                                        } else if ((editedSubtitleB && subtitle) && (editedSubtitleB === subtitle)) {
                                            subtitleStatus = 'sameSubtitle'
                                        } else if ((editedSubtitleB && subtitle) && (editedSubtitleB !== subtitle)) {
                                            subtitleStatus = 'subtitleUpdated';
                                        }
                                        const _tagsB = tagsB.map(tag => {
                                            const { _id, isNew, topic } = tag;
                                            if (isNew) {
                                                return topic.toLowerCase().trim();
                                            };

                                            return _id;
                                        }).sort();
                                        const _tagsA = tagsA.map(tag => {
                                            const { _id, isNew, topic } = tag;
                                            if (isNew) {
                                                return topic.toLowerCase().trim();
                                            };

                                            return _id;
                                        }).sort();
                                        const didTagsChanged = JSON.stringify(_tagsB) !== JSON.stringify(_tagsA);
                                        const bodyWordCountChange = didBodyCountChange && (bodyWordCountA - bodyWordCountB);
                                        const titleWordCountChange = didTitleWordCountChange && (titleWordCountA - titleWordCountB);
                                        const subtitleWordCountChange = subtitle && (subtitleWordCountA - (subtitleWordCountB ?? 0));
                                        // const { body, ...__versionA } = versionA;
                                        // console.log('__versionA', __versionA);
                                        let _versionA = subtitle ?
                                            {
                                                ...versionA,
                                                title: {
                                                    text: title
                                                },
                                                body: {
                                                    wordCount: bodyWordCountA,
                                                    text: versionABody
                                                },
                                                subtitle: {
                                                    text: subtitle
                                                }
                                            }
                                            :
                                            {
                                                ...versionA,
                                                title: {
                                                    text: title
                                                },
                                                body: {
                                                    wordCount: bodyWordCountA,
                                                    text: versionABody
                                                }
                                            }
                                        if (didBodyContentChange) {
                                            _versionA = {
                                                ..._versionA,
                                                body: {
                                                    ..._versionA.body,
                                                    didChange: didBodyContentChange
                                                }
                                            }
                                        }
                                        if (bodyWordCountChange) {
                                            _versionA = {
                                                ..._versionA,
                                                body: {
                                                    ..._versionA.body,
                                                    wordCountChange: bodyWordCountChange
                                                }
                                            }
                                        };
                                        if (titleWordCountChange) {
                                            _versionA = {
                                                ..._versionA,
                                                title: {
                                                    ..._versionA.title,
                                                    wordCountChange: titleWordCountChange
                                                }
                                            }
                                        };
                                        if (didTitleContentChange) {
                                            _versionA = {
                                                ..._versionA,
                                                title: {
                                                    ..._versionA.title,
                                                    didChange: didTitleContentChange
                                                }
                                            }
                                        }
                                        if (subtitleWordCountChange) {
                                            _versionA = {
                                                ..._versionA,
                                                subtitle: _versionA.subtitle ?
                                                    {
                                                        ..._versionA.subtitle,
                                                        wordCountChange: subtitleWordCountChange
                                                    }
                                                    :
                                                    {
                                                        wordCountChange: subtitleWordCountChange
                                                    }
                                            };
                                        };
                                        if (didTagsChanged) {
                                            _versionA = {
                                                ..._versionA,
                                                didTagsChanged
                                            }
                                        };

                                        delete _versionA._id;
                                        return {
                                            ..._versionA,
                                            imgUrl: _imgUrl,
                                            tags: _tags,
                                            subtitle: _versionA.subtitle ?
                                                {
                                                    ..._versionA.subtitle,
                                                    status: subtitleStatus
                                                }
                                                :
                                                {
                                                    status: subtitleStatus
                                                }
                                        }
                                    };

                                    delete versionA._id;
                                    return {
                                        ...versionA,
                                        tags: _tags,
                                        imgUrl,
                                        body: {
                                            wordCount: bodyWordCountA,
                                            text: versionABody.text ?? versionABody
                                        }
                                    }
                                });
                                // _previousVersions = _previousVersions.map(prevVersion => {
                                //     const _prevVersion = { ...prevVersion };
                                //     _prevVersion.body && delete _prevVersion.body;
                                //     return _prevVersion;
                                // })



                                delete post._doc.body;
                                return {
                                    ...post._doc,
                                    imgUrl,
                                    body: {
                                        preview: bodyPreview ?? decodedBodyHtmlStriped,
                                        full: postedBody,
                                        wordCount
                                    },
                                    previousVersions: _previousVersions.reverse()
                                }
                            };

                            delete post._doc.body;
                            delete post._doc.previousVersions;
                            return {
                                ...post._doc,
                                imgUrl,
                                body: {
                                    preview: bodyPreview ?? decodedBodyHtmlStriped,
                                    full: postedBody,
                                    wordCount
                                }
                            };
                        });

                        // putting posts that were posted on the same date in the same object
                        let postsSorted = [];
                        _posts.forEach(post => {
                            const { editsPublishedAt, publicationDate, ...postInfo } = post;
                            const { miliSeconds, time, date } = publicationDate;
                            const doesDateExist = postsSorted.map(({ publicationDate }) => publicationDate).includes(date);
                            if (doesDateExist) {
                                postsSorted = postsSorted.map(post => {
                                    const { publicationDate: _publicationDate, activities } = post;
                                    if (date === _publicationDate) {
                                        const _post = editsPublishedAt ? { ...postInfo, publication: { miliSeconds, time: convertToStandardTime(time) }, editsPublishedAt: { ...editsPublishedAt, time: convertToStandardTime(editsPublishedAt.time) } } : { ...postInfo, publication: { miliSeconds, time: convertToStandardTime(time) } }
                                        return {
                                            ...post,
                                            activities: [...activities, _post]
                                        }
                                    };

                                    return post;
                                })
                            } else {
                                const _post = editsPublishedAt ? { ...postInfo, publication: { miliSeconds, time: convertToStandardTime(time) }, editsPublishedAt: { ...editsPublishedAt, time: convertToStandardTime(editsPublishedAt.time) } } : { ...postInfo, publication: { miliSeconds, time: convertToStandardTime(time) } }
                                const postActivity = { publicationDate: publicationDate.date, isPostByUser: true, activities: [_post] };
                                postsSorted.push(postActivity);
                            }
                        })
                        postsSorted = postsSorted.sort((postA, postB) => {
                            if (postA.publicationDate > postB.publicationDate) return -1;
                            if (postA.publicationDate < postB.publicationDate) return 1;
                            return 0;
                        });
                        postsSorted = postsSorted.map(post => {
                            const _activities = post.activities.sort(({ publication: publicationA }, { publication: publicationB }) => publicationB.miliSeconds - publicationA.miliSeconds);
                            return {
                                ...post,
                                activities: _activities
                            }
                        })
                        response.json({ postsByUser: postsSorted })
                    });
                })
            } else if (willGetPosts) {
                response.json({ isEmpty: true })
            } else if (willGetReadingLists && result?.readingLists) {
                // GOAL: don't get the reading list that was deleted from activities. 
                let postIds = [];
                let { readingLists, activitiesDeleted } = result;
                const dontShowReadingLists = activitiesDeleted?.readingLists;
                Object.keys(readingLists).forEach(listName => {
                    const { list, _id: readingListId } = readingLists[listName];
                    list.length && list.forEach(({ postId }) => { !dontShowReadingLists?.includes(readingListId) && (!postIds.includes(postId) && postIds.push(postId)) });
                });
                if (postIds.length) {
                    BlogPost.find(
                        { $and: [{ _id: { $in: postIds }, authorId: { $nin: blockedUserIds } }] },
                        { authorId: 1, title: 1 }
                    ).then(posts => {
                        if (posts.length) {
                            const userIds = posts.map(({ authorId }) => authorId);
                            User.find(
                                { _id: { $in: userIds } },
                                { username: 1 }
                            ).then(usernames => {
                                let _readingLists = [];
                                Object.keys(readingLists).forEach(listName => {
                                    const { list: savedPosts, createdAt, editedAt, _id: readingListId } = readingLists[listName];
                                    const { time, date } = createdAt;
                                    const isActivityDeleted = dontShowReadingLists?.includes(readingListId)
                                    if (savedPosts.length && !isActivityDeleted) {
                                        // insert all of the info pertaining to the post
                                        const _savedPosts = savedPosts.map(post => {
                                            const savedPost = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(post.postId));
                                            if (savedPost) {
                                                const { title, authorId } = savedPost;
                                                const { username } = usernames.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                                const UIText = `You saved ${username}'s post titled `
                                                return {
                                                    ...post,
                                                    title,
                                                    username,
                                                    UIText
                                                }
                                            }
                                        })
                                        readingLists = {
                                            ...readingLists,
                                            [listName]: {
                                                ...readingLists[listName],
                                                list: _savedPosts
                                            }
                                        }
                                        let _previousNames;
                                        if (readingLists[listName].previousNames) {
                                            readingLists[listName].previousNames.reverse().forEach(name => {
                                                const { oldName, newName, timeOfChange } = name
                                                const { date: dateOfChange, time } = timeOfChange;
                                                const previousName = { oldName, newName, time: convertToStandardTime(time) };
                                                const isDatePresent = _previousNames && _previousNames.map(({ date }) => date).includes(dateOfChange);
                                                if (isDatePresent) {
                                                    _previousNames = _previousNames.map(name => {
                                                        const { date: _dateOfChange, previousNames } = name;
                                                        if (_dateOfChange === dateOfChange) {
                                                            return {
                                                                ...name,
                                                                previousNames: [...previousNames, previousName]
                                                            }
                                                        };

                                                        return name
                                                    })
                                                } else {
                                                    const previousNameDefault = { date: dateOfChange, previousNames: [previousName] }
                                                    _previousNames = _previousNames ? [..._previousNames, previousNameDefault] : [previousNameDefault]
                                                }

                                            })
                                        }
                                        let _readingList = {
                                            ...readingLists[listName],
                                            _id: readingListId,
                                            listName,
                                            createdAt: time
                                        };
                                        if (editedAt) {
                                            _readingList = {
                                                ..._readingList,
                                                editsPublishedAt: {
                                                    ...editedAt,
                                                    time: convertToStandardTime(editedAt.time)
                                                }
                                            }
                                            delete _readingList.editedAt;
                                        }
                                        if (_previousNames) {
                                            _readingList = {
                                                ..._readingList,
                                                previousNames: _previousNames
                                            }
                                        };
                                        console.log('readingList fuck you: ', _readingList)
                                        const isDatePresent = _readingLists.map(({ publicationDate }) => publicationDate).includes(date);
                                        if (isDatePresent) {
                                            _readingLists = _readingLists.map(readingList => {
                                                const { publicationDate, activities } = readingList;
                                                if (publicationDate === date) {
                                                    return {
                                                        ...readingList,
                                                        activities: [...activities, _readingList]
                                                    }
                                                };

                                                return readingList;
                                            })
                                        } else {
                                            const dayOfListsCreation = { publicationDate: date, isReadingLists: true, activities: [_readingList] }
                                            _readingLists.push(dayOfListsCreation)
                                        }
                                    };
                                });
                                if (_readingLists.length) {
                                    _readingLists = _readingLists.reverse();
                                    response.json({ readingLists: _readingLists })
                                } else {
                                    response.json({ isEmpty: true });
                                }
                            })
                        };
                    })
                } else {
                    response.json({ isEmpty: true })
                }
            } else if (willGetReadingLists) {
                response.json({ isEmpty: true });
            } else if (willGetBlockedUsers && result?.blockedUsers?.length) {
                const insertNewActivity = values => {
                    const { dateOfActivity, newActivity, activities, dateField, activityType } = values;
                    let _activities;
                    const doesDateExist = activities?.map(activity => activity[dateField])?.includes(dateOfActivity);
                    if (doesDateExist) {
                        _activities = activities.map(activity => {
                            if (activity[dateField] === dateOfActivity) {
                                return {
                                    ...activity,
                                    activities: [...activity.activities, newActivity]
                                }
                            };

                            return activity;
                        })
                    } else {
                        const dayOfActivity = { [dateField]: dateOfActivity, activities: [newActivity], [activityType]: true };
                        _activities = _activities ? [..._activities, dayOfActivity] : [dayOfActivity];
                    }

                    return _activities;
                }
                const { blockedUsers } = result;
                if (blockedUsers?.length && blockedUserIds?.length) {
                    const delBlockedUserActivityIds = result?.activitiesDeleted?.blockedUsers?.length && result.activitiesDeleted.blockedUsers
                    User.find(
                        { _id: { $in: blockedUserIds } },
                        { username: 1 }
                    ).then(users => {
                        console.log('users: ', users);
                        if (users.length) {
                            let _blockedUsers;
                            blockedUsers.forEach(user => {
                                const { blockedAt, userId } = user;
                                const isActivityDeleted = delBlockedUserActivityIds && delBlockedUserActivityIds.includes(userId);
                                if (!isActivityDeleted) {
                                    const { date, time, miliSeconds } = blockedAt;
                                    const blockedUser = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(userId));
                                    if (blockedUser) {
                                        const { username, _id } = blockedUser;
                                        const _blockedUser = { _id, username, blockedAt: { time, miliSeconds }, uIText: ` blocked ${username}.` };
                                        const _values = { dateOfActivity: date, newActivity: _blockedUser, activities: _blockedUsers, dateField: 'blockedOn', activityType: 'areBlockedUsers' };
                                        _blockedUsers = insertNewActivity(_values)
                                    }
                                };
                            });
                            _blockedUsers = _blockedUsers.map(user => { return { ...user, activities: user.activities.reverse() } });
                            _blockedUsers ? response.json(_blockedUsers) : response.json({ isEmpty: true })
                        } else {
                            response.json({ isEmpty: true })
                        }
                    })
                } else {
                    response.json({ isEmpty: true })
                }
            } else if (willGetBlockedUsers) {
                response.json({ isEmpty: true })
            } else if (willGetFollowing && result?.activities?.following?.length) {
                const { activities, activitiesDeleted } = result;
                const followingActivitiesDel = activitiesDeleted?.following
                const userIds = activities.following.map(({ userId }) => userId);
                User.find(
                    { _id: { $in: userIds } },
                    { username: 1 }
                ).then(users => {
                    // the variable values: the date, time and miliSeconds, and the new activity
                    // GOAL: this function will insert a new activity into the followingUsers array
                    // CASE 1: the function finds the existing date within the array, and adds the new activity within the activities field
                    // the date of the activity exists
                    // if the date of the activity exists in the activities array, then the function finds the existing date within the array, and adds the new activity within the activities field
                    // get the activities array 
                    // get the time of the activity 
                    // get the newActivity 

                    const insertNewActivity = values => {
                        const { dateOfActivity, newActivity, activities, dateField, activityType } = values;
                        let _activities;
                        const doesDateExist = activities?.map(activity => activity[dateField])?.includes(dateOfActivity);
                        if (doesDateExist) {
                            _activities = activities.map(activity => {
                                if (activity[dateField] === dateOfActivity) {
                                    return {
                                        ...activity,
                                        activities: [...activity.activities, newActivity]
                                    }
                                };

                                return activity;
                            })
                        } else {
                            const dayOfActivity = { [dateField]: dateOfActivity, activities: [newActivity], [activityType]: true };
                            _activities = _activities ? [..._activities, dayOfActivity] : [dayOfActivity];
                        }

                        return _activities;
                    }
                    let followingUsers;
                    if (users.length) {
                        console.log('followingActivitiesDel: ', followingActivitiesDel);
                        activities.following.forEach(user => {
                            const isActivityDeleted = followingActivitiesDel?.includes(user.userId);
                            if (!isActivityDeleted) {
                                const { userId: _userId, followedUserAt } = user;
                                const targetUser = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(_userId));
                                if (targetUser) {
                                    const { date, time, miliSeconds } = followedUserAt;
                                    const following = { _id: _userId, followedAt: { miliSeconds, time }, username: targetUser.username, uIText: ` followed ${targetUser.username}.` }
                                    // GOAL: IMPLEMENT THE FUNCTION THAT WILL ADD A NEW ACTIVITY INTO THE ACTIVITIES ARRAY (IN THIS CASE THE ARRAY THAT WILL CONTAIN ALL OF THE USER'S FOLLOWING)
                                    const _values = { dateOfActivity: date, newActivity: following, activities: followingUsers, dateField: 'followedOn', activityType: 'isFollowing' }
                                    followingUsers = insertNewActivity(_values);
                                }
                            };
                        });
                    };
                    if (followingUsers?.length > 1) {
                        followingUsers = followingUsers.sort(({ followedOn: followedOnA }, { followedOn: followedOnB }) => {
                            if (followedOnA > followedOnB) return -1;
                            if (followedOnA < followedOnB) return 1;
                            return 0
                        })
                    };
                    const moreThan1Activity = followingUsers?.some(({ activities }) => activities.length > 1);
                    if (followingUsers && moreThan1Activity) {
                        followingUsers = followingUsers.map(user => {
                            if (user.activities.length > 1) {
                                return {
                                    ...user,
                                    activities: user.activities.reverse()
                                };
                            };

                            return user;
                        })
                    }
                    followingUsers ? response.json(followingUsers) : response.json({ isEmpty: true });
                })
            }
        })
    } else if (name === 'getPreviousListNames') {
        const { listName } = package;
        User.findOne(
            { _id: userId },
            { _id: 0, [`readingLists.${listName}`]: 1 }
        ).then(list => {
            const targetList = list.readingLists[listName];
            const namesSortedByCreation = sortListNamesByCreation(targetList.previousNames.reverse())
            response.json({ previousNames: namesSortedByCreation })
        })
    } else if (name === 'getReadingLists') {
        const { isOnOwnProfile, isViewingPost } = package;
        const getReadingListsAndPostsPics = (_readingLists, posts, users, _userId) => {
            let readingLists = _readingLists;
            const listNames = Object.keys(readingLists);
            let postsWithIntroPics = [];
            const _postIds = posts.map(({ _id }) => _id);
            // deleting all posts that no longer exist
            listNames.forEach(listName => {
                const { list, previousNames } = readingLists[listName];
                let _list = list.filter(({ postId }) => _postIds.includes(postId));
                // delete the post if the author of the post blocked the user that saved their post
                _list = _list.filter(({ postId }) => {
                    const targetPost = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postId))
                    const author = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(targetPost.authorId));
                    const blockedUserIds = author?.blockedUsers?.length ? author.blockedUser.map(({ userId }) => userId) : [];
                    return !blockedUserIds.includes(_userId);
                })
                // GOAL: get the following info: subtitle, title, intro pic, likes, comments, and date of publication
                _list = _list.map(post => {
                    const targetPost = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(post.postId));
                    const { username: authorUsername } = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(targetPost.authorId))
                    const { title, subtitle, imgUrl, comments, userIdsOfLikes, publicationDate, _id } = targetPost;
                    return { ...post, title, subtitle, imgUrl, comments, userIdsOfLikes, publicationDate, authorUsername, _id };
                })
                readingLists = {
                    ...readingLists,
                    [listName]: previousNames ? { ...readingLists[listName], didNameChanged: true, list: _list } : { ...readingLists[listName], list: _list }
                };
                // DO I NEED TO DO THIS?
                // get all of the posts that has intro pics
                _list.forEach(({ postId, isIntroPicPresent }) => {
                    if (isIntroPicPresent) {
                        const _post = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postId))
                        const { _id, imgUrl } = _post;
                        const isPostPresent = !!postsWithIntroPics.find(post => post?._id === _id);
                        !isPostPresent && postsWithIntroPics.push({ _id, imgUrl });
                    };
                })
            });

            return { postsWithIntroPics, readingLists };
        };

        const getPostIds = (readingLists, listNames, postIds) => {
            listNames.forEach(listName => {
                const { list } = readingLists[listName];
                list.length && list.forEach(({ postId }) => { !postIds.includes(postId) && postIds.push(postId) });
            });
        }
        // GOAL: if the author of the post blocked the user that saved their post, then filter out that user 
        User.find({}, { _id: 1, blockedUsers: 1, readingLists: 1, username: 1, iconPath: 1, 'activities.following': 1, followers: 1 }).then(users => {
            const userBeingViewed = !isOnOwnProfile && users.find(({ username: _username }) => JSON.stringify(username) === JSON.stringify(_username));
            const currentUser = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(userId));
            const blockedUserIds = currentUser.blockedUsers?.length && currentUser.blockedUsers.map(({ userId }) => userId);
            if (isOnOwnProfile || userBeingViewed || isViewingPost) {
                console.log('yo meng, sup')
                // if the user is viewing a different user's reading list, then get the reading list info for that user
                let { _id, readingLists, iconPath, activities, followers } = (isOnOwnProfile || isViewingPost) ? currentUser : userBeingViewed;
                const currentUserReadingLists = (!isOnOwnProfile && !isViewingPost) && currentUser.readingLists
                const currentUserListNames = currentUserReadingLists && Object.keys(currentUserReadingLists);
                let listsToDel;
                let postIds = [];
                if (readingLists) {
                    console.log('washington');
                    let listNames = Object.keys(readingLists);
                    // when viewing a diff user, delete all of the lists that are private
                    (!isOnOwnProfile && !isViewingPost) && listNames.forEach(listName => {
                        if (readingLists[listName].isPrivate) {
                            delete readingLists[listName];
                            listsToDel = listsToDel ? [...listsToDel, listName] : [listName];
                        }
                    });

                    // when viewing a diff user, delete all of the list names that are private
                    listNames = (listsToDel && !isOnOwnProfile) ? listNames.filter(listName => !listsToDel.includes(listName)) : listNames
                    if (listNames.length) {
                        // get all of the postIds for the search query on the BlogPost collection
                        listNames.forEach(listName => {
                            const { list } = readingLists[listName];
                            list.length && list.forEach(({ postId }) => { !postIds.includes(postId) && postIds.push(postId) });
                        });
                        // get the post ids of the posts that were saved by the current user when viewing the reading lists of another user
                        (!isOnOwnProfile && currentUserListNames) && getPostIds(currentUserReadingLists, currentUserListNames, postIds);
                        BlogPost.find({ $and: [{ _id: { $in: postIds }, authorId: { $nin: blockedUserIds } }] }, { publicationDate: 1, title: 1, imgUrl: 1, subtitle: 1, comments: 1, userIdsOfLikes: 1, authorId: 1 }).then(posts => {
                            const _userId = (isOnOwnProfile || isViewingPost) ? userId : userBeingViewed._id;
                            let { readingLists: _readingLists, postsWithIntroPics } = getReadingListsAndPostsPics(readingLists, posts, users, _userId);
                            // if the user is viewing a different user's profile, then get the reading list of the current user as well 
                            let _currentUserReadingLists;
                            if (!isOnOwnProfile) {
                                const { readingLists, postsWithIntroPics: _postsWithIntroPics } = getReadingListsAndPostsPics(currentUserReadingLists, posts, users, userId)
                                _currentUserReadingLists = readingLists;
                                _postsWithIntroPics?.length && _postsWithIntroPics.forEach(post => {
                                    const postsWithIntroPicsIds = postsWithIntroPics.map(({ _id }) => _id);
                                    !postsWithIntroPicsIds.includes(post._id) && postsWithIntroPics.push(post)
                                })
                            }

                            let userDefaultVals = !isOnOwnProfile ? { _id, readingLists: _readingLists, userIconPath: iconPath, _currentUserReadingLists } : { readingLists: _readingLists };
                            if (followers?.length && !isOnOwnProfile) {
                                userDefaultVals = {
                                    ...userDefaultVals,
                                    followers
                                }
                            };
                            if (activities?.following?.length && !isOnOwnProfile) {
                                userDefaultVals = {
                                    ...userDefaultVals,
                                    following: activities.following
                                }
                            }
                            postsWithIntroPics.length ? response.json({ postsWithIntroPics, ...userDefaultVals }) : response.json({ ...userDefaultVals });
                        })
                    } else {
                        let user = { userIconPath: iconPath };
                        if (followers) {
                            user = { ...user, followers };
                        };
                        if (activities?.following?.length) {
                            user = { ...user, following: activities.following };
                        };
                        console.log('user: ', user);
                        response.json(user);
                    }
                } else if (!isOnOwnProfile) {
                    let user = { userIconPath: iconPath };
                    if (followers) {
                        user = { ...user, followers };
                    };
                    if (activities?.following?.length) {
                        user = { ...user, following: activities.following };
                    };
                    console.log('user: ', user);
                    response.json(user);
                } else {
                    response.json({ isEmpty: true })
                }
            } else {
                response.sendStatus(404);
            }
        })
    } else if (name === 'getReadingListNamesAndUsers') {
        User.find({}, { __v: 0, password: 0, phoneNum: 0, publishedDrafts: 0, belief: 0, email: 0, topics: 0, reasonsToJoin: 0, sex: 0, notifications: 0, roughDrafts: 0, socialMedia: 0 }).then(users => {
            const currentUser = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(userId));
            let { readingLists, blockedUsers, activities } = currentUser;
            const blockedUserIds = blockedUsers?.length && blockedUsers.map(({ userId }) => userId);
            const _users = users.map(user => {
                if (user.readingList) {
                    delete user.readingList;
                    return user;
                };

                return user;
            })
            if (readingLists) {
                const readingListsNames = Object.keys(readingLists);
                let postIds = [];
                readingListsNames.forEach(listName => {
                    if (readingLists?.[listName]?.list?.length) {
                        readingLists[listName].list.forEach(({ postId }) => {
                            !postIds.includes(postId) && postIds.push(postId);
                        })
                    }
                });
                if (postIds.length) {
                    BlogPost.find(
                        { $and: [{ _id: { $in: postIds }, authorId: { $nin: blockedUserIds } }] }
                    ).then(posts => {
                        if (posts.length) {
                            readingListsNames.forEach(listName => {
                                const listByUser = readingLists[listName];
                                if (listByUser?.list?.length) {
                                    const _list = listByUser.list.filter(({ postId }) => {
                                        // check if the post exist and if the author of the post blocked the current user
                                        const targetPost = posts.find(({ _id }) => _id === postId);
                                        // check if the post exist
                                        if (targetPost) {
                                            const author = _users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(targetPost.authorId));
                                            const didAuthorBlockedUser = author.blockedUsers?.length && author.blockedUsers.map(({ userId }) => userId).includes(userId);
                                            // check if the post author blocked the current user
                                            return !didAuthorBlockedUser;
                                        }
                                        return false;
                                    });
                                    // if the list lengths are not the same, that means one or more posts has been deleted, insert the new list into the field of list of the reading list object 
                                    if (_list.length !== listByUser.list.length) {
                                        readingLists = {
                                            ...readingLists,
                                            [listName]: {
                                                ...readingLists[listName],
                                                list: _list
                                            }
                                        }
                                    };
                                }
                            });
                            const data = activities?.following?.length ? { readingLists, users: _users, following: activities.following } : { readingLists, users: _users }
                            response.json(data);
                        } else {
                            const data = activities?.following?.length ? { readingLists, users: _users, following: activities.following } : { readingLists, users: _users }
                            response.json(data);
                        }

                    });
                } else {
                    const data = activities?.following?.length ? { readingLists, users: _users, following: activities.following } : { readingLists, users: _users }
                    response.json(data);
                }
            } else {
                const data = activities?.following?.length ? { following: activities.following, users: _users } : { users: _users };
                response.json(data);
            }
        })
    } else if (name === 'checkListNameExistence') {
        const { listName } = package;
        console.log('listName: ', listName)
        User.findOne({ _id: userId, [`readingLists.${listName}`]: { $exists: true } }, { _id: 0 }).countDocuments().then(doesExist => {
            console.log({ doesExist });
            response.json(!!doesExist);
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
