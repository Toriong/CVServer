const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const timeFns = require("../functions/getTime");
const { getTime } = timeFns;
const BlogPost = require('../models/blogPost');
const User = require("../models/user");
const Tag = require("../models/tag");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
// make an activities for all of the edits that the user did to comments replies and posts 

// GOAL: display all notifications pertaining to the following: replies on user's post, replies to user comments, comments on user's posts, likes for the following: (comments, replies, posts)

const getPostsOfReadingLists = (res, savedPosts, readingList, blockedUserIds = []) => {
    const savedPostIds = savedPosts.map(({ postId }) => postId);
    User.find({}, { username: 1 }).then(users => {
        BlogPost.find({ $and: [{ _id: { $in: savedPostIds }, authorId: { $nin: blockedUserIds } }] })
            .then(posts => {
                if (posts.length) {
                    // an array with the following data structure is sent to the server: {date of the saved post, the post id}
                    let postsBySavedDates;
                    const _posts = posts.map(post => {
                        const { title, subtitle, imgUrl, userIdsOfLikes, comments, authorId, publicationDate, _id } = post;
                        const postAuthor = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                        const defaultPostVals = { title, userIdsOfLikes, comments, authorId, authorUsername: postAuthor.username, publicationDate, _id };
                        let _post = { ...defaultPostVals };
                        if (imgUrl) {
                            _post = { ..._post, imgUrl };
                        };
                        if (subtitle) {
                            _post = { ..._post, subtitle };
                        };

                        return _post;
                    });
                    // group posts based on the date that they were saved 
                    savedPosts.forEach(post => {
                        const { savedAt, postId } = post;
                        const { date: dateOfSave, time } = savedAt
                        const _post = _posts.find(post => post?._id === postId);
                        if (_post) {
                            const savedPost = { ..._post, savedAt: time };
                            const doesDateExist = postsBySavedDates && postsBySavedDates.map(({ date }) => date).includes(dateOfSave);
                            if (doesDateExist) {
                                postsBySavedDates = postsBySavedDates.map(postByDate => {
                                    const { date, posts } = postByDate;
                                    if (date === dateOfSave) {
                                        return {
                                            ...postByDate,
                                            posts: [...posts, savedPost]
                                        }
                                    };

                                    return postByDate
                                })
                            } else {
                                const newSavedPosts = { date: dateOfSave, posts: [savedPost] };
                                postsBySavedDates = postsBySavedDates ? [...postsBySavedDates, newSavedPosts] : [newSavedPosts]
                            }
                        };
                    });
                    postsBySavedDates = postsBySavedDates.map(post => {
                        if (post.posts.length > 1) {
                            return {
                                ...post,
                                posts: post.posts.reverse()
                            }
                        };

                        return post;
                    });
                    console.log('postsBySavedDates: ', postsBySavedDates);
                    console.table(postsBySavedDates);
                    res.json({ posts: postsBySavedDates.reverse(), readingList: readingList });
                } else {
                    res.json({ isEmpty: true })
                }
            });
    });
}

const getPostTags = (selectedTags, tags) => selectedTags.map(tag => {
    const { isNew, _id: postTagId } = tag;
    if (!isNew) {
        const _tag = tags.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postTagId));

        return _tag;
    };

    return tag;
});




//get the blogPost from the database and sends it to the Feed.js component
router.route("/blogPosts").get((req, res) => {
    BlogPost.find()
        .then(blogPosts => { res.json(blogPosts) })
});


router.route("/blogPosts").post((req, res) => {
    const { name, data } = req.body;
    const { _id, title, authorId, subtitle, imgUrl, body, tags } = data
    if (name === "publishDraft") {
        let newPost;
        if (subtitle && imgUrl) {
            console.log("I was executed")
            newPost = new BlogPost({
                _id,
                title,
                authorId,
                subtitle,
                imgUrl,
                body,
                tags,
                publicationDate: timeFns.getTime()
            });
        } else if (!subtitle && imgUrl) {
            console.log("no subtitle present, publishing post")
            newPost = new BlogPost({
                _id,
                title,
                authorId,
                imgUrl,
                body,
                tags,
                publicationDate: timeFns.getTime()
            });
        } else if (subtitle && !imgUrl) {
            console.log("no intro pic present, publishing post");
            newPost = new BlogPost({
                _id,
                title,
                authorId,
                subtitle,
                body,
                tags,
                publicationDate: timeFns.getTime()
            });
        } else {
            newPost = new BlogPost({
                _id,
                title,
                authorId,
                body,
                tags,
                publicationDate: timeFns.getTime()
            });
        };
        newPost.save()
        console.log("post published")
        res.json({
            message: "blog post successfully posted onto feed."
        });
    };
});

router.route("/blogPosts/updatePost").post((req, res) => {
    const { name, postId, data, userId } = req.body;

    // GOAL: update the target blog post by getting the blog post and pushing the new comment into the field of comments
    if (name === "newComment") {
        BlogPost.updateOne(
            { _id: postId },
            {
                $push: {
                    comments: data
                }
            },
            (error, numbersAffected) => {
                if (error) {
                    console.error(`Error message: ${error}`);
                } else {
                    console.log("User commented on post. NumbersAffected: ", numbersAffected)
                    res.json("post requested received, new comment added");
                }
            }
        );
    } else if (name === "commentEdited") {
        const { commentId } = req.body;
        const { editedComment, updatedAt, oldCommentCreatedAt, oldComment } = data;
        const previousComment = {
            id: uuidv4(),
            createdAt: oldCommentCreatedAt,
            text: oldComment
        }
        BlogPost.updateOne(
            {
                _id: postId,
                "comments.commentId": commentId
            },
            {
                $set:
                {
                    "comments.$.comment": editedComment,
                    "comments.$.updatedAt": updatedAt
                },
                $push:
                {
                    "comments.$.previousComments": previousComment
                }
            },
            (error, numbersAffected) => {
                if (error) {
                    console.error(`Error message: ${error}`);
                }
                console.log("User edited comment. NumbersAffected: ", numbersAffected)
                res.json('Comment was edited.')
            }
        );
    } else if (name === "newReply") {
        const { commentId } = req.body;
        console.log("data: ", data);
        BlogPost.updateOne(
            {
                _id: postId,
                "comments.commentId": commentId
            },
            {
                $push:
                {
                    "comments.$.replies": data
                }
            },
            (error, numbersAffected) => {
                if (error) {
                    console.error(`Error message: `, error);
                }
                console.log("User replied to a comment. NumbersAffected: ", numbersAffected);
                res.end();
            }
        )
    } else if (name === "editedReply") {
        const { replyId, commentId } = req.body;
        const { _editedReply, updatedAt, oldReply, oldReplyPostedAt } = data;
        // GOAL: send the updatedAt object to the server if it exist or send the createdAt object if the updatedAt object doesn't exist 
        const previousReply = {
            id: uuidv4(),
            createdAt: oldReplyPostedAt,
            text: oldReply
        }
        BlogPost.updateOne(
            {
                _id: postId,
                "comments.commentId": commentId
            },
            {
                $set:
                {
                    "comments.$.replies.$[reply]._reply": _editedReply,
                    "comments.$.replies.$[reply].updatedAt": updatedAt
                },
                $push:
                {
                    "comments.$.replies.$[reply].previousReplies": previousReply
                }
            },
            {
                multi: false,
                arrayFilters: [{ "reply.replyId": replyId }]
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("reply edited, numbersAffected: ", numbersAffected);
                    res.json('Reply was edited.');
                }
            }
        )
        // res.json("post requested received, reply edited");
    } else if (name === "deleteComment") {
        const { commentId: _commentId } = req.body;
        BlogPost.updateOne(
            { _id: postId },
            {
                $pull:
                {
                    comments: { commentId: _commentId }
                }
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("comment deleted, numbersAffected: ", numbersAffected);
                    res.json("Post requested received, comment deleted.")
                }
            }
        )
    } else if (name === "deleteReply") {
        const { commentId, selectedReplyId: replyId_ } = req.body;
        BlogPost.updateOne(
            {
                _id: postId,
                "comments.commentId": commentId
            },
            {
                $pull:
                {
                    "comments.$.replies": { replyId: replyId_ }
                }
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("reply deleted, numbersAffected: ", numbersAffected);
                    res.json("Post requested received, reply deleted.")
                }
            }
        );
    } else if (name === "userLikedPost") {
        const { signedInUserId: userId_, likedAt } = data
        // GOAL: push the id of the user into blogPost.likes
        BlogPost.updateOne(
            { _id: postId },
            {
                $push:
                {
                    userIdsOfLikes: {
                        userId: userId_,
                        likedAt
                    }
                }
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("user likes post, numbersAffected: ", numbersAffected);
                    res.json("Post requested received, user like saved.")
                }
            }
        )
    } else if (name === "userUnlikedPost") {
        const { signedInUserId: userId_ } = req.body
        // GOAL: push the id of the user into blogPost.likes
        BlogPost.updateOne(
            { _id: postId },
            {
                $pull:
                {
                    userIdsOfLikes: { userId: userId_ }
                }
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("user unliked post, numbersAffected: ", numbersAffected);
                    res.json("Post requested received, user's unliked post.")
                }
            }
        )
    } else if (name === "commentLiked") {
        const { commentId } = req.body;
        const { signedInUserId: userId, likedAt } = data;
        console.log("likedAt", likedAt)
        BlogPost.updateOne(
            {
                _id: postId,
                "comments.commentId": commentId
            },
            {
                $addToSet:
                {
                    "comments.$.userIdsOfLikes": { userId, likedAt }
                }
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("user liked comment, numbersAffected: ", numbersAffected);
                    res.json("Post requested received, users liked comment. DB updated.")
                }
            }
        )
    } else if (name === "commentUnLiked") {
        const { signedInUserId: _userId, commentId } = req.body;
        BlogPost.updateOne(
            {
                _id: postId,
                "comments.commentId": commentId
            },
            {
                $pull:
                {
                    "comments.$.userIdsOfLikes": { userId: _userId }
                }
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("user unliked comment, numbersAffected: ", numbersAffected);
                    res.json("Post requested received, user unliked comment. DB updated.")
                }
            }
        )
    } else if (name === "replyLiked") {
        const { commentId, replyId } = req.body
        const { signedInUserId: userId, likedAt } = data;
        BlogPost.updateOne(
            {
                _id: postId,
                "comments.commentId": commentId
            },
            {
                $addToSet:
                {
                    "comments.$.replies.$[reply].userIdsOfLikes": { userId, likedAt }
                }
            },
            {
                multi: false,
                arrayFilters: [{ "reply.replyId": replyId }]
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("user liked a reply, numbersAffected: ", numbersAffected);
                    res.json("Post requested received, users liked a reply. DB updated.")
                }
            }
        )
    } else if (name === "replyUnliked") {
        const { signedInUserId: _userId, commentId, replyId } = req.body;
        BlogPost.updateOne(
            {
                _id: postId,
                "comments.commentId": commentId
            },
            {
                $pull:
                {
                    "comments.$.replies.$[reply].userIdsOfLikes": { userId: _userId }
                }
            },
            {
                arrayFilters: [{ "reply.replyId": replyId }]
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("user unliked a reply, numbersAffected: ", numbersAffected);
                    res.json("Post requested received, user unliked a reply. DB updated.")
                }
            }
        )
    } else if (name === 'deleteBlockUserActivity') {
        // GOAL: get all of the comments 
        const { authorId, blockedUser, commentActivity, replyActivity } = req.body;
        BlogPost.updateMany(
            { authorId: authorId },
            {
                $pull:
                {
                    userIdsOfLikes: { userId: blockedUser },
                    comments: { userId: blockedUser },
                    'comments.replies.$[reply].userIdsOfLikes': { userId: blockedUser }
                    // GO THROUGH EACH comment.replies field and see if the blocked user made a reply to any of the comments on the user's post. If so, then delete the user's reply 
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting the the comments and post likes from blocked user: ', error);
                }
                console.log("Update for deleting blocked user's comments and post likes is done, numsAffected: ", numsAffected);
            }
        );
    } else if (name === 'deleteBlockedUserContent') {
        // GOAL: DELETE ALL REPLIES AND COMMENTS MADE BY THE BLOCKED USER
        // CU = 'current user'
        const { commentsOnCUPosts, repliesOnCUPosts, blockedUser } = req.body;
        if (repliesOnCUPosts) {
            const postIds = repliesOnCUPosts.map(({ postId }) => postId);
            const commentIds = repliesOnCUPosts.map(({ repliedToComments }) => repliedToComments).flat();
            BlogPost.updateMany(
                { _id: { $in: postIds } },
                {
                    $pull:
                    {
                        'comments.$[comment].replies': { userId: blockedUser }
                    }
                },
                {
                    multi: true,
                    arrayFilters: [{ 'comment.commentId': { $in: commentIds } }]
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error('Error in deleting blocked user replies on current user post.');
                    } else {
                        console.log('Attempt to delete replies o blocked user, results: ', numsAffected);
                        !commentsOnCUPosts && res.json('Blocked user replies has been deleted on current user posts.')
                    }
                }
            )
        };
        res.json('Post requested received, will update user posts');

    } else if (name === 'editPost') {
        const { draftId: postId, field, wasPicDeleted, imgUrl } = req.body;
        const { timeOfLastEdit, draftUpdated } = data;

        if (wasPicDeleted) {
            // Don't delete the image if it is the only one in the file system
            // check if the path name of the image that is sent to the server matches with the path name that is currently stored for the intro pic of the target post 
            // if they match, then don't delete any images. Otherwise, delete the image 
            // still proceed to set the timeOfLastEdit and unset the imgUrl

            // check if the field 'editedPost' exist. If it does, then proceed with the code below. If it doesn't, then create the editedPost field 

            BlogPost.findOne({ _id: postId }).then(result => {
                // GOAL:  get all of the tag info for the posted article, when the  
                const { editedPost, imgUrl: postIntroPic } = result;
                const isSamePic = postIntroPic === imgUrl;

                // only delete the image that is stored in 'editedPost' field of the targeted post, not the image that is posted on the blog
                if (!isSamePic && imgUrl) {
                    console.log('Will delete the intro pic of post that is being edited.')
                    fs.unlink(`./postIntroPics/${imgUrl}`, err => {
                        if (err) {
                            console.error("Failed to delete", err)
                        } else {
                            console.log('image deleted.')
                        }
                    });
                } else {
                    console.log('Pic that was deleted is the same as the pic that is posted.');
                }

                if (editedPost) {
                    BlogPost.updateOne(
                        {
                            _id: postId,
                        },
                        {
                            $set:
                            {
                                "editedPost.timeOfLastEdit": timeOfLastEdit,
                            },
                            $unset:
                            {
                                "editedPost.imgUrl": ""
                            }
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error("Error in deleting intro pic of posted draft. Error message: ", error)
                            };
                            console.log("User deleted intro pic from draft that was posted. Draft updated, numsAffected: ", numsAffected);
                        }
                    );
                } else {
                    // GOAL:  get all of the tag info for the posted article, when the  
                    delete draftUpdated.imgUrl;
                    const _editedPost = {
                        ...draftUpdated,
                        timeOfLastEdit
                    };
                    BlogPost.updateOne(
                        {
                            _id: postId,
                        },
                        {
                            $set:
                            {
                                editedPost: _editedPost,
                            }
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error("Error in deleting intro pic of posted draft. Error message: ", error)
                            };
                            console.log("User deleted intro pic from draft that was posted. Draft updated, numsAffected: ", numsAffected);
                        }
                    );
                }

                res.json({ message: 'Edit made to copy of posted article.' });
            });
        } else {
            // insert new edits into the editPost field
            // GOAL: update the whole entire field of editedPost whenever the user updates any of the fields in the front-end
            BlogPost.updateOne(
                {
                    _id: postId,
                },
                {
                    $set:
                    {
                        editedPost: { ...draftUpdated, timeOfLastEdit }
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                    } else {
                        console.log(`First edit. The field '${field}' was updated, numsAffected: `, numsAffected);
                        res.json({ message: 'First edit. Edit made to copy of posted article.' });
                    }
                }
            );



            // BlogPost.findOne(
            //     { _id: postId },
            //     error => {
            //         if (error) {
            //             console.error('An error has occurred in getting the target post to be edited: ', error);
            //         } else {
            //             console.log('No error has occurred in getting the target post to be edited.')
            //         }
            //     }
            // ).then(result => {
            //     // GOAL: whenever there is an update to whatever aspect of the draft that was updated, updated the whole entire field of 'editedPost'
            //     const { editedPost, ...postInfo } = result;
            //     if (editedPost) {
            //         BlogPost.updateOne(
            //             {
            //                 _id: postId,
            //             },
            //             {
            //                 $set:
            //                 {
            //                     [`editedPost.${field}`]: draftUpdate,
            //                     'editedPost.timeOfLastEdit': timeOfLastEdit
            //                 }
            //             },
            //             (error, numsAffected) => {
            //                 if (error) {
            //                     console.error("error message: ", error);
            //                 } else {
            //                     console.log(`${field} was updated, numsAffected: `, numsAffected);
            //                     res.json({ message: 'Edit made to copy of posted article.' });
            //                 }
            //             }
            //         )

            //     } else {
            //         const { _id, authorId, __v, comments, userIdsOfLikes, publicationDate, previousVersions, editsPublishedAt, ...postContent } = postInfo._doc
            //     };
            // })
        }
    } else if (name === 'publishEdits') {
        // GOAL: set the following fields: title, body, subtitle (if exist), imgUrl (if exist), and tags 
        // GOAL: push the old version of the draft into the oldVersions field
        // console.log('newPostEdits: ', newPostEdits);
        // console.log('postId: ', postId);
        const { title, body, subtitle, imgUrl, _id: postId, tags } = data;
        BlogPost.findOne(
            { _id: postId }, { body: 1, title: 1, tags: 1, subtitle: 1, imgUrl: 1, publicationDate: 1, editsPublishedAt: 1 },
            error => {
                if (error) {
                    console.error('Something happen in getting the post to publish its edits.')
                }
            }
        ).then(result => {
            const { body: previousBody, title: previousTitle, subtitle: previousSubtitle, imgUrl: previousImgUrl, tags: previousTags, publicationDate, editsPublishedAt } = result;
            let newPostEdits;
            let previousPost;
            let fieldsToDel = {
                editedPost: ''
            }

            if (subtitle) {
                newPostEdits = { subtitle: subtitle };
            } else {
                fieldsToDel = {
                    ...fieldsToDel,
                    subtitle: ''
                }
            }
            if (imgUrl) {
                newPostEdits = newPostEdits ? { ...newPostEdits, imgUrl } : { imgUrl };
            } else {
                fieldsToDel = {
                    ...fieldsToDel,
                    imgUrl: ''
                }
            }
            newPostEdits = newPostEdits ? { ...newPostEdits, title: title, body: body, tags: tags, editsPublishedAt: getTime() } : { title: title, body: body, tags: tags, editsPublishedAt: getTime() };

            if (previousSubtitle) {
                previousPost = { subtitle: previousSubtitle };
            }
            if (previousImgUrl) {
                previousPost = previousPost ? { ...previousPost, imgUrl: previousImgUrl } : { imgUrl: previousImgUrl };
            }
            previousPost = previousPost ? { ...previousPost, _id: uuidv4(), body: previousBody, title: previousTitle, tags: previousTags, publicationDate: editsPublishedAt ?? publicationDate } : { _id: uuidv4(), body: previousBody, title: previousTitle, tags: previousTags, publicationDate: editsPublishedAt ?? publicationDate };

            console.log({ newPostEdits });
            console.log('imgUrl: ', imgUrl);
            if (fieldsToDel) {
                BlogPost.updateOne(
                    {
                        _id: postId,
                    },
                    {
                        $unset: fieldsToDel,
                    },
                    (error, numsAffected) => {
                        if (error) {
                            console.error("error message: ", error);
                        } else {
                            console.log(`'imgUrl' or 'subtitle' field was deleted, numsAffected: `, numsAffected);
                        }
                    }
                );
            }

            BlogPost.updateOne(
                {
                    _id: postId,
                },
                {
                    $set: newPostEdits,
                    $push:
                    {
                        previousVersions: previousPost
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                    } else {
                        console.log(`Edits were posted, numsAffected: `, numsAffected);
                        res.json({ message: 'Edits were posted.' });
                    }
                }
            );
        });
    } else if (name === 'deletePost') {
        console.log('req.body: ', req.body);
        BlogPost.deleteOne(
            { _id: postId },
            (error, numsAffected) => {
                if (error) {
                    console.log('An error has occurred in deleting published post by user: ', error);
                } else {
                    console.log('Post was deleted, numsAffected: ', numsAffected);
                    User.updateOne(
                        { _id: userId },
                        {
                            $pull:
                            {
                                publishedDrafts: postId
                            }
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error('An error has occurred in deleting the id of the post from published draft field of user: ', error)
                            }
                            console.log("Published  draft id has been deleted from user's account, numsAffected: ", numsAffected);
                            res.sendStatus(200);
                        }
                    )
                }
            }
        )
    }
});

const postIntroPicStorage = multer.diskStorage({
    destination: 'postIntroPics',
    filename: (req, file, cb) => {
        console.log('loading file');
        console.log('file: ', file);
        const { userId, postId, timeOfLastEdit } = req.body;
        const timeOfLastEdit_ = JSON.parse(timeOfLastEdit);
        const imgPath = timeOfLastEdit_.miliSeconds + '_' + userId + '_' + postId + path.extname(file.originalname);
        cb(null, imgPath);
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


// what is the 'single' method doing?
router.route('/blogPosts/editPostAddPic').post(postIntroPicUpload.single('file'), (req, res) => {
    console.log("req.body: ", req.body);
    const extname = path.extname(req.file.originalname);
    const { postId, userId, timeOfLastEdit } = req.body;
    const timeOfLastEdit_ = JSON.parse(timeOfLastEdit);
    console.log({ timeOfLastEdit_ });
    const introPicUrl = timeOfLastEdit_.miliSeconds + '_' + userId + '_' + postId + extname;
    BlogPost.findOne({ _id: postId }).then(result => {
        console.log("result: ", result);
        // GOAL:  get all of the tag info for the posted article, when the  
        const { editedPost, ...postInfo } = result;
        const { _id, authorId, __v, comments, userIdsOfLikes, publicationDate, editsPublishedAt, previousVersions, ...postContent } = postInfo._doc

        if (!editedPost) {
            const _editedPost = {
                ...postContent,
                imgUrl: introPicUrl,
                timeOfLastEdit: timeOfLastEdit_
            };
            BlogPost.updateOne(
                {
                    _id: postId,
                },
                {
                    $set: {
                        editedPost: _editedPost
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                    }
                    console.log("Pic update for posted draft that is being edited. NumsAffected: ", numsAffected);
                    res.json({ imgUrl: introPicUrl });
                }
            )
        } else {
            BlogPost.updateOne(
                {
                    _id: postId,
                },
                {
                    $set: {
                        "editedPost.timeOfLastEdit": timeOfLastEdit_,
                        "editedPost.imgUrl": introPicUrl
                    }
                },
                (error, numsAffected) => {
                    if (error) {
                        console.error("error message: ", error);
                    }
                    console.log("Pic update for posted draft that is being edited. NumsAffected: ", numsAffected);
                    res.json({ imgUrl: introPicUrl });
                }
            )
        }
    })
}, (error, req, res, next) => {
    const { status } = res;
    if (status === 400 && error) {
        console.error("Error message: ", error);
        res.json({ message: "An error has occurred. Your image may be too large. Please try again and upload a different image." })
    };

    console.log('Request completed')
});

const getPosts = (userId, res, userInfo) => {
    BlogPost.find({ authorId: userId ?? userInfo._id }).then(posts => {
        if (posts.length) {
            res.json({ arePostsPresent: true, _posts: posts, userInfo: userInfo });
        } else {
            res.json({ arePostsPresent: false });
        }
    })
}


router.route("/blogPosts/:package").get((req, res) => {
    console.log("get user's published posts");
    const package = JSON.parse(req.params.package);
    console.log('package: ', package);
    const { name, signedInUserId: userId, draftId, savedPosts, postId, username } = package;
    // change this to 'getPublishedDraftsByAuthor'
    if (name === "getPublishedDrafts") {
        if (username) {
            console.log('bruhhhh')
            User.findOne({ username: username }, { _id: 1, firstName: 1, lastName: 1, followers: 1, 'activities.following': 1, iconPath: 1, readingLists: 1 }).then(user => {
                if (user) {
                    const { _id, followers, activities, iconPath, firstName, lastName, readingLists } = user;
                    const { following } = activities;
                    let userInfo = { _id, iconPath, firstName, lastName };
                    userInfo = following?.length ? { ...userInfo, following } : userInfo;
                    userInfo = followers?.length ? { ...userInfo, followers } : userInfo;
                    userInfo = readingLists ? { ...userInfo, readingLists } : userInfo;
                    getPosts(_id, res, userInfo);
                } else {
                    res.json({ doesUserExist: false })
                }
            })
        } else {
            console.log('yolo')
            getPosts(userId, res);
        }
        // change to 'getOtherPostsFromAuthorOfPost'
    } else if (name === "getPost") {
        BlogPost.find(
            // why I am using the or operator, use the $AND operator?
            { $or: [{ _id: draftId }, { authorId: package.authorId }] },
            error => {
                if (error) {
                    console.error("error in finding the draft: ", error)
                }
            }
        ).then(posts => {
            // between each draft, if the publication date is greater, then include it in the array
            // if there is an edit date, then use that instead to make the comparison
            console.log('posts: ', posts.length);
            const targetPost = posts.find(({ _id }) => _id === draftId);
            const restsOfPosts = posts.filter(({ _id }) => _id !== draftId)
            let _posts;
            if (restsOfPosts.length > 3) {
                const postsByTime = restsOfPosts.sort((postA, postB) => {
                    const { miliSeconds: miliSecondsPostA } = postA.publicationDate;
                    const { miliSeconds: miliSecondsPostB } = postB.publicationDate;
                    if (postA.editDate && postB.editDate) {
                        if (postA.editDate.miliSeconds > postB.editDate.miliSeconds) return -1;
                        if (postA.editDate.miliSeconds < postB.editDate.miliSeconds) return 1;
                        return 0;
                    } else if (postA.editDate && !postB.editDate) {
                        if (postA.editDate.miliSeconds > miliSecondsPostB) return -1;
                        if (postA.editDate.miliSeconds < miliSecondsPostB) return 1;
                        return 0;
                    } else if (!postA.editDate && postB.editDate) {
                        if (miliSecondsPostA > postB.editDate.miliSeconds) return -1;
                        if (miliSecondsPostA < postB.editDate.miliSeconds) return 1;
                        return 0;
                    } else {
                        if (miliSecondsPostA > miliSecondsPostB) return -1;
                        if (miliSecondsPostA < miliSecondsPostB) return 1;
                        return 0;
                    }
                });
                console.log('postsByTime: ', postsByTime)
                _posts = {
                    moreFromAuthor: [...postsByTime.slice(0, 3)],
                    targetPost
                }
            } else if (restsOfPosts.length >= 1 && restsOfPosts.length < 3) {
                _posts = {
                    moreFromAuthor: [...posts.filter(({ _id }) => _id !== draftId)],
                    targetPost
                };
            } else {
                _posts = { targetPost };
            }
            res.json(_posts);
        });
    } else if (name === 'getAllWithOutBlockedUsers') {
        console.log('excluding posts from blocked users')
        const { blockedUsers } = package;
        BlogPost.find(
            { authorId: { $nin: blockedUsers } },
            error => {
                if (error) {
                    console.error('An error has occurred in getting all blog posts: ', error);
                }
            }
        ).then(blogPosts => {
            console.log('blog posts received')
            res.json(blogPosts)
        })
    } else if (name === 'getIntroPicsOfPosts') {
        // GOAL: get the intro pics of the first three posts (or any if less than three posts have intro pics) of each reading list and send the intro pics down to the client. 
        // the posts with intro pics are attained and sent back to the client  
        // the results of the query should be as follows: {the id of the post, the imgUrl}
        // make a query based on the array that has all of the intro pics saved 
        // an array containing all of the post ids is sent up to the server 
        BlogPost.find(
            { _id: { $in: savedPosts } },
            { _id: 1, imgUrl: 1 }
        ).then(posts => {
            console.log('beef and ribeye')
            res.json(posts);
        })
    } else if (name === 'getSavedPosts') {
        console.log({ package })
        const _savedPostIds = savedPosts?.length && savedPosts.map(({ postId }) => postId);
        const { listName, isOnOwnProfile, username } = package;
        if (isOnOwnProfile) {
            console.log('will get saved Posts from user being viewed')
            // console.log('userId, get saved posts of reading list: ', userId);
            // User.find({ $or: [{ _id: userId }, { username: username }] }, { readingLists: 1, blockedUsers: 1, username: 1 }).then(results => {
            //     const userBeingViewed = results.find(({ username: _username }) => JSON.stringify(_username) === JSON.stringify(username))
            //     const currentUser = results.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(userId));
            //     const blockedUserIds = currentUser.blockedUsers?.length && currentUser.blockedUsers.map(({ userId }) => userId);
            //     if (userBeingViewed?.readingLists?.[listName]?.list?.length) {
            //         const listBeingViewed = userBeingViewed.readingLists[listName];
            //         const { list } = listBeingViewed;
            //         blockedUserIds ? getPostsOfReadingLists(res, list, listBeingViewed, blockedUserIds) : getPostsOfReadingLists(res, list, listBeingViewed)
            //     } else {
            //         console.log('burritossss ')
            //         res.json({ isEmpty: true });
            //     }
            // })

            // brain storm notes:
            // get the reading list that is by the current user and that the current user is viewing
            // sent up the listName to the backend
            // get the reading list that is being viewed first and access the list field
            // use the post ids to make a query to the blog post collection to get all of the posts that are stored in the reading list
            // based on the reading list by the current user, filter out the posts based on the following:
            // IF THE POST DOESN'T EXIST
            // if the post author blocked the current user
            // with the posts, insert the following: {title, subtitle, the intro pic, comments, userIdsOfLikes}
            // sort out the posts according to the date that they were posted 
            User.find({}, { readingLists: 1, blockedUsers: 1, username: 1 }).then(users => {
                const currentUser = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(userId));
                const { readingLists, blockedUsers } = currentUser;
                const blockedUserIds = blockedUsers?.length && blockedUsers.map(({ userId }) => userId);
                if (readingLists?.[listName]?.list) {
                    const { list, previousNames } = readingLists[listName];
                    const postIds = list.length && list.map(({ postId }) => postId);
                    if (postIds?.length) {
                        BlogPost.find({ $and: [{ _id: { $in: postIds }, authorId: { $nin: blockedUserIds } }] }, { _id: 1, imgUrl: 1, title: 1, subtitle: 1, comments: 1, userIdsOfLikes: 1, publicationDate: 1, authorId: 1 }).then(posts => {
                            const postIdsResults = posts.map(({ _id }) => _id);
                            const savedPosts = list.filter(({ postId }) => postIdsResults.includes(postId))
                            console.log('savedPosts: ')
                            console.table(savedPosts)
                            let postsBySavedDates;
                            if (savedPosts.length) {
                                savedPosts.forEach(post => {
                                    const { savedAt, postId } = post;
                                    const { date: dateOfSave, time } = savedAt
                                    const _post = posts.find(post => JSON.stringify(post?._id) === JSON.stringify(postId));
                                    const { username: authorUsername } = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(_post.authorId))
                                    // const { title, subtitle, comments, userIdsOfLikes, imgUrl, publicationDate } = _post;
                                    const savedPost = { ..._post._doc, authorUsername, savedAt: time };
                                    const doesDateExist = postsBySavedDates && postsBySavedDates.map(({ date }) => date).includes(dateOfSave);
                                    if (doesDateExist) {
                                        postsBySavedDates = postsBySavedDates.map(postByDate => {
                                            const { date, posts } = postByDate;
                                            if (date === dateOfSave) {
                                                return {
                                                    ...postByDate,
                                                    posts: [...posts, savedPost]
                                                }
                                            };

                                            return postByDate
                                        })
                                    } else {
                                        const newSavedPosts = { date: dateOfSave, posts: [savedPost] };
                                        postsBySavedDates = postsBySavedDates ? [...postsBySavedDates, newSavedPosts] : [newSavedPosts]
                                    }
                                });
                                postsBySavedDates = postsBySavedDates.reverse();
                                postsBySavedDates = postsBySavedDates.map(post => {
                                    if (post.posts.length > 1) {
                                        return {
                                            ...post,
                                            posts: post.posts.reverse()
                                        };
                                    };

                                    return post;
                                });
                                previousNames && delete readingLists[listName].previousNames;
                                console.log('readingList[listName]: ', readingLists[listName])
                                const _readingLists = { ...readingLists, [listName]: { ...readingLists[listName], list: savedPosts, didNameChanged: !!previousNames } }
                                res.json({ posts: postsBySavedDates, allReadingLists: _readingLists })
                            } else {
                                previousNames && delete readingLists[listName].previousNames;
                                console.log('readingList[listName]: ', readingLists[listName])
                                const _readingLists = { ...readingLists, [listName]: { ...readingLists[listName], list: savedPosts, didNameChanged: !!previousNames } }
                                res.json({ allReadingLists: _readingLists })
                            };
                        })
                    } else {
                        console.log('ribeye steak')
                        previousNames && delete readingLists[listName].previousNames;
                        const _allReadingLists = {
                            ...readingLists,
                            [listName]: {
                                ...readingLists[listName],
                                didNameChanged: !!previousNames
                            }
                        }
                        res.json({ allReadingLists: _allReadingLists })
                    }
                } else if (!readingLists[listName]) {
                    // the list no longer exist
                    res.sendStatus(404)

                }
            })
            // GOAL: get the current user reading list and all sort the post info in the backend 
            // the saved posts are sorted by the date and they are sent to the client 
            // 
        } else {
            const sortByPostsByDate = list => {
                let _savedPosts;
                list.forEach(post => {
                    const { date: dateOfSave, time } = post.savedAt
                    const savedPost = { ...post, savedAt: time };
                    const doesDateExist = _savedPosts && _savedPosts.map(({ date }) => date).includes(dateOfSave);
                    if (doesDateExist) {
                        _savedPosts = _savedPosts.map(postByDate => {
                            const { date, posts } = postByDate;
                            if (date === dateOfSave) {
                                return {
                                    ...postByDate,
                                    posts: [...posts, savedPost]
                                }
                            };

                            return postByDate
                        })
                    } else {
                        const newSavedPosts = { date: dateOfSave, posts: [savedPost] };
                        _savedPosts = _savedPosts ? [..._savedPosts, newSavedPosts] : [newSavedPosts]
                    };
                });

                _savedPosts = _savedPosts.map(post => {
                    if (post.posts.length > 1) {
                        return {
                            ...post,
                            posts: post.posts.reverse()
                        }
                    };

                    return post;
                })

                return _savedPosts.reverse();
            }
            // BRAIN DUMP NOTES:
            // CHECK FOR THE FOLLOWING:
            // check if the author of the post blocked the current user or the user that saved post
            // check if the user that the current user is viewing has blocked the author of the post


            //GOAL: get the list that the current user is viewing that is by the diff user, get all of its posts
            // along with the reading list of the user, the savedPost of the list that is being viewed is sent to the client: {posts, readingLists}
            // the saved posts of the list that is being viewed is sorted according to the date that it was saved
            // if the post exist. Else, then delete the post
            // if the author of the post was blocked by the current user or was blocked by the owner of the reading list, then delete the post
            // if the author of the post blocked either the user that is being viewed or the current user, then delete the post 
            // check for the following three above:
            // the posts are received
            // make a query to the blogposts collection to get all of the posts that were saved in the list that is being viewed
            // get all of the post id of the posts that were saved in the list that is being viewed
            // the users are received
            // a query is sent to the users collection, project 'blockedUsers', 'readingLists', and 'username'
            User.find({}, { blockedUsers: 1, readingLists: 1, username: 1 }).then(users => {
                const userBeingViewed = users.find(({ username: _username }) => JSON.stringify(_username) === JSON.stringify(username));
                const currentUser = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(userId));
                if (userBeingViewed) {
                    const { readingLists, blockedUsers: userViewedBlockedUsers, _id: userBeingViewedId } = userBeingViewed;
                    const { blockedUsers: blockedUsersOfCurrentUser } = currentUser;
                    const targetList = readingLists?.[listName];
                    if (targetList) {
                        const savedPosts = targetList.list;
                        if (savedPosts.length) {
                            let blockedUserIds = userViewedBlockedUsers?.length ? userViewedBlockedUsers.map(({ userId }) => userId) : [];
                            blockedUsersOfCurrentUser && blockedUsersOfCurrentUser.forEach(({ userId }) => { !blockedUserIds.includes(userId) && blockedUserIds.push(userId) })
                            const savedPostIds = savedPosts.map(({ postId }) => postId);
                            BlogPost.find({ $and: [{ _id: { $in: savedPostIds }, authorId: { $nin: blockedUserIds } }] }, { _id: 1, imgUrl: 1, title: 1, subtitle: 1, comments: 1, userIdsOfLikes: 1, publicationDate: 1, authorId: 1 }).then(posts => {
                                if (posts.length) {
                                    // GOAL: filter out the saved posts that meet the following criteria: 
                                    // if the post doesn't exist
                                    // if the author of the post blocked the current user
                                    // if the author of the post blocked the user being viewed
                                    const postIds = posts.map(({ _id }) => _id);
                                    let _savedPosts = savedPosts.filter(({ postId, authorId }) => {
                                        const author = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                        const authorBlockedUserIds = author?.blockedUsers?.length && author.blockedUsers.map(({ userId }) => userId);
                                        const doesPostExist = postIds.includes(postId);
                                        const didAuthorBlockedUser = authorBlockedUserIds && authorBlockedUserIds.includes(userBeingViewed || userId);
                                        if (didAuthorBlockedUser) return false;
                                        if (!doesPostExist) return false;
                                        return true;
                                    });
                                    if (_savedPosts.length) {
                                        _savedPosts = _savedPosts.map(post => {
                                            const { savedAt, postId } = post;
                                            const savedPost = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postId));
                                            const { _id, imgUrl, title, subtitle, userIdsOfLikes, comments, publicationDate, authorId } = savedPost;
                                            const { username } = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
                                            return { title, subtitle, imgUrl, comments, userIdsOfLikes, publicationDate, _id, savedAt, authorUsername: username }
                                        })
                                        const savedPostsSortedByDate = sortByPostsByDate(_savedPosts);
                                        targetList.previousNames && delete targetList.previousNames
                                        const _readingLists = { ...readingLists, [listName]: { ...targetList, list: _savedPosts, didNameChanged: !!targetList.previousNames } }
                                        const listBeingViewed = { allReadingLists: _readingLists, posts: savedPostsSortedByDate }
                                        console.log('listBeingViewed: ', listBeingViewed);
                                        res.json(listBeingViewed);
                                    } else {
                                        // the list is empty
                                        targetList.previousNames && delete targetList.previousNames
                                        const _readingLists = { ...readingLists, [listName]: { ...targetList, didNameChanged: !!targetList.previousNames } };
                                        res.json({ allReadingLists: _readingLists })
                                    }
                                } else {
                                    // the list is empty
                                    targetList.previousNames && delete targetList.previousNames
                                    const _readingLists = { ...readingLists, [listName]: { ...targetList, didNameChanged: !!targetList.previousNames } };
                                    res.json({ allReadingLists: _readingLists })
                                }
                            })
                        } else {
                            // the list is empty
                            const _readingLists = { ...readingLists, [listName]: { ...targetList, didNameChanged: !!targetList.previousNames } };
                            res.json({ allReadingLists: _readingLists })
                        }
                    } else {
                        // the list was deleted
                        res.sendStatus(404)
                    }
                } else {
                    // the user that is being viewed no longer exist
                    res.sendStatus(404)
                }
            })



            // GOAL #1: get the user reading lists
            // the reading lists is sent to the client along with the saved posts of the list that is being viewed sorted according to the date
            // if the reading list that is being viewed has the field 'previousNames', then add the 'didNameChanged' field with a boolean according to whether or not the it has the field
            // the reading list field of the author that is being viewed is accessed 
            // the user that is being viewed is accessed. 

        };
        // change to 'getPublishedPostsByUser'
    } else if (name === 'getPublishedPosts') {
        const { publishedPostsIds } = package;
        BlogPost.find(
            { _id: { $in: publishedPostsIds } },
            error => {
                if (error) {
                    console.error('An error has occurred in getting the published posts by current user.')
                } else {
                    console.log('No error has occurred in getting the published posts by current user.')
                }
            }
        ).then(posts => {
            console.log({ publishedPostsIds });
            console.log('posts by user: ', posts);
            console.log('userId, activitiesDeleted: ', userId);
            User.findOne({ _id: userId }, { 'activitiesDeleted.posts': 1, _id: 0 }).then(result => {
                console.log('result, activitiesDeletedPost: ', result)
                const activitiesDeletedPosts = result?.activitiesDeleted?.posts
                console.log('activitiesDeletedPosts: ', activitiesDeletedPosts)
                Tag.find({})
                    .then(tags => {
                        const getPublishedTags = (postTags, tags) => postTags.map(tag => {
                            const { isNew, _id: tagId } = tag;
                            if (!isNew) {
                                const allTagInfo = tags.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(tagId));

                                return allTagInfo;
                            };

                            return tag;
                        });
                        if (posts.length) {
                            const _posts = posts.map(post => {
                                const { editedPost, tags: postTags, _id } = post;
                                const isActivityDeleted = activitiesDeletedPosts?.includes(_id);
                                _id === "a3bb030a-5c05-49e3-9c14-490d90c62223" && console.log('isActivityDeleted: ', isActivityDeleted);
                                if (editedPost) {
                                    const _tags = getPublishedTags(postTags, tags);
                                    const editedPostTags = editedPost.tags.map(tag => {
                                        const { isNew, _id: tagId } = tag;
                                        if (!isNew) {
                                            const allTagInfo = tags.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(tagId));

                                            return allTagInfo;
                                        };

                                        return tag;
                                    });
                                    console.log('editedPost: ', editedPost);
                                    return {
                                        ...post._doc,
                                        isActivityDeleted,
                                        editedPost: {
                                            ...editedPost,
                                            tags: editedPostTags
                                        },
                                        tags: _tags
                                    }
                                }
                                // if the post has editedPost field, then get all of the tag info for that field 
                                // if the post doesn't have an editedPost field, then get all of the tag info for that field 

                                const _tags = postTags.map(tag => {
                                    const { isNew, _id: tagId } = tag;
                                    if (!isNew) {
                                        const allTagInfo = tags.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(tagId));

                                        return allTagInfo;
                                    };

                                    return tag;
                                });

                                return {
                                    ...post._doc,
                                    isActivityDeleted,
                                    tags: _tags
                                }
                            });

                            res.json({ publishedPosts: _posts });
                        } else {
                            res.json({ isEmpty: true });
                        }
                    });
            });
        })
    } else if (name === 'getPostToEdit') {
        console.log('will get published post to edit it.');
        const { draftId } = package;
        BlogPost.findOne(
            { _id: draftId },
            error => {
                if (error) {
                    console.error('An error has occurred in getting the published post by current user.')
                } else {
                    console.log('No error has occurred in getting the published post by current user.')
                }
            }
        ).then(post => {
            Tag.find({})
                .then(tags => {
                    const { editedPost, ...postedArticle } = post;
                    const { tags: _tags } = postedArticle._doc;
                    const _postTags = editedPost ? getPostTags(editedPost.tags, tags) : getPostTags(_tags, tags);
                    const postToEdit = editedPost ?
                        {
                            ...editedPost,
                            tags: _postTags
                        }
                        :
                        {
                            ...postedArticle._doc,
                            tags: _postTags
                        };
                    res.json({ ...postToEdit, isPostPublished: true });
                });
        });
    } else if (name === 'checkIfEditsOccurred') {
        // GOAL: check if edits actually occurred for the post 

        // BRAINSTORM ROUGH DRAFT:
        // if there is no 'editedPost' field, then send a false boolean to the client side to disable the publish button
        // if there is an 'editedPost' field, then compare the body, title, subtitle (if present), tags, and the imgUrl (if present) if they are the same 
        // if they are the same then send a false boolean to the client side to disable the publish button 
        BlogPost.findOne(
            { _id: draftId },
            error => {
                if (error) {
                    console.error('An error has occurred in getting the published post by current user.')
                } else {
                    console.log('No error has occurred in getting the published post by current user.')
                }
            }
        ).then(post => {
            if (post?.editedPost) {
                const { ...postedDraft } = post;
                let { _doc: _postedDraft } = postedDraft;
                let { subtitle, imgUrl, publicationDate, editedPost, _id, userIdsOfLikes, authorId, __v, comments, previousVersions, editsPublishedAt, ...__postedDraft } = _postedDraft;
                let { subtitle: editPostSubtitle, imgUrl: editPostImgUrl, timeOfLastEdit, ..._editedPost } = editedPost;

                if (subtitle) {
                    __postedDraft = { ...__postedDraft, subtitle };
                };
                if (imgUrl) {
                    __postedDraft = { ...__postedDraft, imgUrl }
                };
                if (editPostSubtitle) {
                    _editedPost = { ..._editedPost, subtitle: editPostSubtitle };
                }
                if (editPostImgUrl) {
                    _editedPost = { ..._editedPost, imgUrl: editPostImgUrl };
                };

                console.log({
                    _editedPost,
                    __postedDraft
                });
                const wasEdited = !(JSON.stringify(_editedPost) === JSON.stringify(__postedDraft));
                res.json(wasEdited);
            } else {
                res.json(false);
            }
        });
    } else if (name === 'checkIfPostsExist') {
        console.log('bitchhhhh')
        const { userId, postIds } = package
        console.log('userId: ', userId)
        User.findOne({ _id: userId }, { readingLists: 1, _id: 0, blockedUsers: 1 }).then(result => {
            console.log('result: ', result);
            const { readingLists, blockedUsers } = result;
            const blockedUserIds = blockedUsers ? blockedUsers.map(({ userId }) => userId) : [];
            BlogPost.find(
                { $and: [{ _id: { $in: postIds }, authorId: { $nin: blockedUserIds } }] },
            ).then(posts => {
                const savedPostIds = posts.map(({ _id }) => _id);
                let _readingLists = readingLists;
                Object.keys(readingLists).forEach(listName => {
                    const readingList = readingLists[listName];
                    if (readingList.list.length) {
                        const _list = readingList.list.filter(({ postId }) => savedPostIds.includes(postId));
                        _readingLists = {
                            ..._readingLists,
                            [listName]: {
                                ..._readingLists[listName],
                                list: _list
                            }
                        }
                    }

                })
                res.json(_readingLists)
            })

        })

    }
});


module.exports = router;