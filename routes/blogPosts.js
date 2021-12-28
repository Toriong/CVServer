const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const timeFns = require("../functions/getTime");
const { getTime } = timeFns;
const BlogPost = require('../models/blogPost');
const Tag = require("../models/tag");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
// make an activities for all of the edits that the user did to comments replies and posts 

// GOAL: display all notifications pertaining to the following: replies on user's post, replies to user comments, comments on user's posts, likes for the following: (comments, replies, posts)


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
    const { name, postId, data } = req.body;

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


        // once there is a match, access the replies field and the delete all replies that were written by the blocked user 
        // go through each comment, and find the matching comment that is in the commentIds array
        // update the blogPosts by using the array of the post ids as your search query 
        // get all of the post Ids and put them into an array
        // get all of the commentIds an put them into an array
        res.json('Post requested received, will update user posts');

    } else if (name === 'editPost') {
        const { draftId: postId, field, wasPicDeleted, imgUrl } = req.body;
        const { timeOfLastEdit, data: draftUpdate } = data;

        if (wasPicDeleted) {
            // Don't delete the image if it is the only one in the file system
            // check if the path name of the image that is sent to the server matches with the path name that is currently stored for the intro pic of the target post 
            // if they match, then don't delete any images. Otherwise, delete the image 
            // still proceed to set the timeOfLastEdit and unset the imgUrl

            // check if the field 'editedPost' exist. If it does, then proceed with the code below. If it doesn't, then create the editedPost field 

            BlogPost.findOne({ _id: postId }).then(result => {
                console.log("result: ", result);
                // GOAL:  get all of the tag info for the posted article, when the  
                const { editedPost, ...postInfo } = result;
                const { _id, authorId, __v, comments, userIdsOfLikes, publicationDate, editsPublishedAt, previousVersions, ...postContent } = postInfo._doc
                const { imgUrl: postIntroPic } = postContent;
                const isSamePic = postIntroPic === imgUrl;

                if (!isSamePic) {
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
                    delete postContent.imgUrl;
                    const _editedPost = {
                        ...postContent,
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
            // check if the editedPost exist 
            // if the editedPost field doesn't exist, then insert the current version of the draft into the field 'editedPost'
            // if the editedPost field does exist, then set the updates into the editedPost and using dot notation insert the edits into the field that was changed 
            BlogPost.findOne(
                { _id: postId },
                error => {
                    if (error) {
                        console.error('An error has occurred in getting the target post to be edited: ', error);
                    } else {
                        console.log('No error has occurred in getting the target post to be edited.')
                    }
                }
            ).then(result => {
                const { editedPost, ...postInfo } = result;
                if (editedPost) {
                    BlogPost.updateOne(
                        {
                            _id: postId,
                        },
                        {
                            $set:
                            {
                                [`editedPost.${field}`]: draftUpdate,
                                'editedPost.timeOfLastEdit': timeOfLastEdit
                            }
                        },
                        (error, numsAffected) => {
                            if (error) {
                                console.error("error message: ", error);
                            } else {
                                console.log(`${field} was updated, numsAffected: `, numsAffected);
                                res.json({ message: 'Edit made to copy of posted article.' });
                            }
                        }
                    )

                } else {
                    const { _id, authorId, __v, comments, userIdsOfLikes, publicationDate, previousVersions, editsPublishedAt, ...postContent } = postInfo._doc
                    // GOAL:  get all of the tag info for the posted article, when the  
                    const _editedPost = {
                        ...postContent,
                        timeOfLastEdit,
                        [field]: draftUpdate,
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
                                console.error("error message: ", error);
                            } else {
                                console.log(`First edit. The field '${field}' was updated, numsAffected: `, numsAffected);
                                res.json({ message: 'First edit. Edit made to copy of posted article.' });
                            }
                        }
                    );
                };
            })
        }
    } else if (name === 'publishEdits') {
        // GOAL: set the following fields: title, body, subtitle (if exist), imgUrl (if exist), and tags 
        // GOAL: push the old version of the draft into the oldVersions field
        // console.log('newPostEdits: ', newPostEdits);
        // console.log('postId: ', postId);
        const { title, body, subtitle, imgUrl, _id: postId } = data;
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

            newPostEdits = newPostEdits ? { ...newPostEdits, title: title, body: body, editsPublishedAt: getTime() } : { title: title, body: body, editsPublishedAt: getTime() };

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



router.route("/blogPosts/:package").get((req, res) => {
    console.log("get user's published posts")
    const package = JSON.parse(req.params.package);
    const { name, signedInUserId: userId, draftId, savedPosts } = package;
    // change this to 'getPublishedDraftsByAuthor'
    if (name === "getPublishedDrafts") {
        BlogPost.find({ authorId: userId }).then(posts => {
            if (posts.length) {
                res.json(
                    {
                        arePostsPresent: true,
                        _posts: posts
                    }
                )
            } else {
                res.json(
                    {
                        arePostsPresent: false,
                    }
                )
            }
        })
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
            res.json(posts);
        })
    } else if (name === 'getSavedPosts') {
        BlogPost.find({ _id: { $in: savedPosts } })
            .then(posts => {
                if (posts.length) {
                    // get the following from the posts:
                    // the intro pic (if any)
                    // the likes of the post 
                    // the comments
                    // subtitle (if any)
                    // title
                    const _posts = posts.map(post => {
                        const { title, subtitle, imgUrl, userIdsOfLikes, comments, authorId, publicationDate, _id } = post;
                        let _post;
                        if (imgUrl) {
                            _post = { imgUrl };
                        };
                        if (subtitle) {
                            _post = _post ? { ..._post, subtitle } : { subtitle };
                        };

                        return _post ? { ..._post, title, userIdsOfLikes, comments, authorId, publicationDate, _id } : { title, userIdsOfLikes, comments, authorId, publicationDate, _id };
                    });
                    res.json(_posts);
                }
            });
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
            Tag.find({})
                .then(tags => {
                    if (posts.length) {
                        const _posts = posts.map(post => {
                            const { editedPost, tags: postTags } = post;
                            if (editedPost) {
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
                                    editedPost: {
                                        ...editedPost,
                                        tags: editedPostTags
                                    }
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
                                tags: _tags
                            }
                        });

                        res.json({ publishedPosts: _posts });
                    } else {
                        res.json({ isEmpty: true });
                    }
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
            if (post.editedPost) {
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
    }
});


module.exports = router;