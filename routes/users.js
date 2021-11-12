const express = require('express');
const router = express.Router();
const User = require("../models/user");
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline)
const upload = multer()

// NOTES:
// do you need the msOfCurrentYear?

// GOAL: DELETE INTRO PIC FROM SERVER WHEN THE RED DELETE BUTTON IS PRESSED


// let gfs;
// const conn = mongoose.createConnection(dbconnection, {
//     useUnifiedTopology: true,
//     useNewUrlParser: true
// });
// conn.once('open', () => {
//     gfs = Grid(conn.db, mongoose.mongo)
//     gfs.collection('uploads')
// });



// const storage = new GridFsStorage({
//     url: dbconnection,
//     file: (req, file) => {
//         return new Promise((resolve, reject) => {
//             crypto.randomBytes(16, (err, buf) => {
//                 if (err) {
//                     return reject(err);
//                 }
//                 const filename = buf.toString('hex') + path.extname(file.originalname);
//                 const fileInfo = {
//                     filename: filename,
//                     bucketName: 'uploads'
//                 };
//                 resolve(fileInfo);
//             });
//         });
//     }
// });





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



// update the user's profile
// CAN rename route to "/users/updateUserInfo"
// don't need to use the params
// don't use username, use the id of the user 
router.route("/users/updateInfo").post((request, response) => {
    const { name, data, userId } = request.body
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
        const { data: draftId } = request.body;
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
                        // WHY DO I NEED THIS CODE BELOW?
                        // const { activities } = results[0]
                        // response.json(activities);

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
        console.log('data: ', data);
        const { newFollowingUserId, signedInUserId, followedUserAt } = data;
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
    } else if (name === "blockOrRemoveFollower") {
        const { deleteUser, isBlock } = request.body;
        console.log('request.body: ', request.body);
        if (isBlock) {
            User.updateOne(
                { _id: userId },
                {
                    $pull:
                    {
                        followers: { userId: deleteUser }
                    },
                    $push:
                    {
                        blockedUsers: deleteUser
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in deleting and blocking follower: ', error);
                        response.status(404).send('Failed to block and deleted')
                    } else {
                        console.log('Update was successful. User was deleted as a follower and blocked, numsAffected: ', numsAffected);
                        response.json('Follower was deleted and blocked.')
                    };
                }
            )
        } else {
            User.updateOne(
                { _id: userId },
                {
                    $pull:
                    {
                        followers: { userId: deleteUser }
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in deleting and blocking follower: ', error);
                        response.status(404).send('Failed to block and deleted')
                    } else {
                        console.log('Update was successful. User was deleted as a follower, numsAffected: ', numsAffected);
                        response.json('Follower was deleted.')
                    };
                }
            )
        }
    }
}, (error, req, res, next) => {
    if (error) {
        res.json('An error has occurred. Please try again later.')
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






// USE THE ID OF THE USER INSTEAD TO FIND THE USER
router.route("/users/:package").get((request, response) => {
    const package = JSON.parse(request.params.package);
    const { password: passwordAttempt, name, userId, username } = package;
    console.log('username: ', username);
    if (name === "signInAttempt") {
        console.log("user wants to sign in")
        User.find({ username: username }).then(user => {
            if ((user[0] && user[0].password) === passwordAttempt) {
                const { username, firstName, lastName, iconPath, _id, readingLists, topics, activities, isUserNew, bio, socialMedia } = user[0];
                console.log('password matches user signed backed in.')
                console.log("user signed back in")
                let user_;
                if (activities) {
                    delete (activities._id);
                    user_ = { _id, iconPath, username, isUserNew, firstName, lastName, activities: activities, bio }
                }
                if (readingLists && Object.keys(readingLists).length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, readingLists } : { _id, iconPath, isUserNew, username, firstName, lastName, readingLists, bio }
                }
                if (topics && topics.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, topics } : { _id, iconPath, isUserNew, username, firstName, lastName, topics, bio }
                };
                if (socialMedia && socialMedia.length) {
                    user_ = (user_ && Object.keys(user_).length) ? { ...user_, socialMedia } : { _id, iconPath, isUserNew, username, firstName, lastName, socialMedia, bio }
                }
                response.json({
                    message: `Welcome back ${username}!`,
                    user: user_ ?? { username, firstName, lastName, iconPath, _id, isUserNew, bio }
                });
            } else {
                console.error("Sign-in attempt FAILED");
                response.status(401).send('Invalid username or password.');
            }
        }).catch(error => {
            if (error) {
                console.error("error message: ", error);
                response.status(401).send({ message: 'Something went wrong. Please try again later.' });
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
    }
});

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
