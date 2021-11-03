const { request } = require('express');
const express = require('express');
const router = express.Router();
const getTime = require("../functions/getTime");
const BlogPost = require('../models/blogPost');

// NOTES:
// get 10 posts at a time

//get the blogPost from the database and sends it to the Feed.js component
router.route("/blogPosts").get((req, res) => {
    BlogPost.find()
        .then(blogPost => { res.json(blogPost) })
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
                publicationDate: getTime()
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
                publicationDate: getTime()
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
                publicationDate: getTime()
            });
        } else {
            newPost = new BlogPost({
                _id,
                title,
                authorId,
                body,
                tags,
                publicationDate: getTime()
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
    console.log("user commented on a post, inserting new comment")
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
                }
                console.log("User commented on post. NumbersAffected: ", numbersAffected)
            }
        );
        res.json("post requested received, new comment added");
    } else if (name === "commentEdited") {
        const { commentId } = req.body;
        const { _editedComment, updatedAt } = data;
        BlogPost.updateOne(
            {
                _id: postId,
                "comments.commentId": commentId
            },
            {
                $set: {
                    "comments.$.comment": _editedComment,
                    "comments.$.updatedAt": updatedAt
                }
            },
            (error, numbersAffected) => {
                if (error) {
                    console.error(`Error message: ${error}`);
                }
                console.log("User edited comment. NumbersAffected: ", numbersAffected)
            }
        );
        res.json("post requested received, commented updated");
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
                    console.error(`Error message: ${error}`);
                }
                console.log("User replied to a comment. NumbersAffected: ", numbersAffected)
            }
        )
        res.json("post requested received, reply added to comment");
    } else if (name === "editedReply") {
        const { replyId, commentId } = req.body;
        const { _editedReply, updatedAt } = data;
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
                }
            }
        )
        res.json("post requested received, reply edited");
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
        // GOAL: pull the id of the user that unliked the reply in activities.likes.replies
        // the user id is found and is pulled from the activities.likes.replies by using the userId
        // the reply is found by using the replyId, array filter ["reply.id": replyId]
        // the comment that the user replied is found: array filter ["comment.id": commentId]
        // the post is found by using the post id 
        // the following package is received from the front-end: {postId, commentId, replyId, userId}
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
                multi: false,
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
    }
})


router.route("/blogPosts/:package").get((req, res) => {
    console.log("get user's published posts")
    const package = JSON.parse(req.params.package);
    const { name, signedInUserId: userId, draftId } = package;
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
    } else if (name === "getPost") {
        const { authorId } = package;
        // WHAT I WANT: I want to get the first five documents but the document must include the post the the current use wants to read 
        // GOAL: get all of the posts that is written by the author that the current user wants to read along with the three most recent articles that are written by the author excluding the current post that is being read by the current user 
        // use the authorId to find all of the posts that is written by the author
        // only get the first five 
        // have the query include the draftId as well 
        console.log({
            draftId,
            authorId
        })
        BlogPost.find(
            { $or: [{ _id: draftId }, { authorId: authorId }] },
            error => {
                if (error) {
                    console.error("error in finding the draft: ", error)
                }
            }
        ).then(posts => {
            // between each draft, if the publication date is greater, then include it in the array
            // if there is an edit date, then use that instead to make the comparison
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
            } else if (restsOfPosts.length > 1 && restsOfPosts.length < 3) {
                _posts = {
                    moreFromAuthor: [...posts.filter(({ _id }) => _id !== draftId)],
                    targetPost
                };
            } else {
                _posts = { targetPost };
            }
            res.json(_posts);
        });
    }
});


module.exports = router;