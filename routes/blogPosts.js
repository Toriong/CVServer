const { ObjectId } = require('bson');
const { request, response } = require('express');
const express = require('express');
const router = express.Router();
const getTime = require("../functions/getTime");
const BlogPost = require('../models/blogPost');
const User = require('../models/user');
// make an activities for all of the edits that the user did to comments replies and posts 

// GOAL: display all notifications pertaining to the following: replies on user's post, replies to user comments, comments on user's posts, likes for the following: (comments, replies, posts)



// FEATURES:
// real time updates for notifications

// store the notifications into the db 


// MAIN GOAL: notify the author of the user when another user replies, get the time of that reply 

// NOTES:
// show the content of the reply on the user's notifications page 
// notifications.replies
// notifications.comments
// notifications will be an object that will consist of the following:
// comments
// replies (consist of replies on user's post and replies to user's comments)
// likes: {comments, replies, posts}
// followingNewPosts
// the storing for notifications.replies will be stored as follows: {postId, commentId, and the replyId}
// when the user replies to another user notify the following: whoever the user replied to, the author of the post  
// all replies and comments on user's post will notify the author of the post 
// case one: the user replies to a user who is not the author of a post but has a commented on the post 
// case two: the user replies to a user's comment who is the author of the post
// before notify the user who wrote the reply, check first if the user who wrote the comment, also wrote the post. If the user 
// when displaying the notifications for replies, check if the user wrote the post. If the user did wrote the post, then display the following, (userA replied to your comment on your post: 'comment data here');
// using the array that has all of the ids of the articles that were posted by the current user, checked if the post that the user replied on was written by the current user 

// GOAL FOR REPLY DISPLAY: display all of the replies that were made on the user's post: "userA replied to a comment on your post: 'the reply data here'"

// GOAL FOR REPLY THAT WAS MADE TO THE CURRENT USER DISPLAY: display all of the replies that were made on the user's post when the comment was made by the author of the post: "userA replied to your comment on your post: 'the reply data here'"

// GOAL: IF THE USER REPLIES TO A COMMENT THAT WAS MADE ON THE CURRENT USER'S POST AND THE COMMENT WAS MADE BY THE AUTHOR OF THE POST HAVE THE FOLLOWING DISPLAYED: "userA replied to your comment on your post: 'the reply data here'"
// all that is in notifications.replies is sent to the client

// GOAL: store the user replies notifications with the following format: [{postId, repliesInfo:[{commentAuthorId, commentsRepliedTo: [{id, replies: [{authorId, replies:[id of replies]}]]

// CASE #1: the userA replies again to userB's comment and the post is written by userB
// the replyId is pushed into replyIds
// the author is found in the array that is stored in replies 
// the comment that userA replied to found by using the commentId in the array that is stored in repliesInfo
// the post if found by using the postId of where the reply resides in. 
// the following is sent to the backend: {name of package, postId, commentId, authorIdOfComment, authorId of reply, the id of the reply}
// userA's id exists (the author of the reply has already made a reply to the target comment before)
// check if userA's id exists in the commentsRepliedTo.replies array {authorId} 
// the comment id exists 
// check if the comment id that userA replied to exists in commentsRepliedTo  
// the author id of the comment exists in the repliesInfo array 
// check if the author id of the comment that userA replied to exists in repliesInfo
// the post id exists in notifications.replies
// check if the post id exists in notifications.replies
// the notifications.replies array of userB is retrieved from the database
// get the id of the post 
// get the id of the comment 




// GOAL:
// when the user replies on a post, send a notification to the author of that post

// the notification will be stored in the db as follows: {id of the notification, the id of the post, the id of the comment, [the id of the reply]: [{replyId, wasSeen}] }





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

    }
})

router.route("/blogPosts/:package").get((req, res) => {
    console.log("get user's published posts")
    const package = JSON.parse(req.params.package);
    const { name, signedInUserId: userId, draftId, savedPosts } = package;
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
            })
    }
});


module.exports = router;