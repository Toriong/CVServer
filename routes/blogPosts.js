const { request } = require('express');
const express = require('express');
const router = express.Router();
const getTime = require("../functions/getTime");
const BlogPost = require('../models/blogPost');

//get the blogPost from the database and sends it to the Feed.js component
router.route("/blogPosts").get((req, res) => {
    console.log("get all blog posts")
    BlogPost.find()
        .then(blogPost => res.json(blogPost))
});


router.route("/blogPosts").post((req, res) => {
    const package = req.body;
    const data = package.data;
    if (package.name === "publishDraft") {
        let newPost;
        if (data._subtitle && data._introPic) {
            console.log("I was executed")
            newPost = new BlogPost({
                _id: data._id,
                title: data._title,
                username: package.username,
                subtitle: data._subtitle,
                introPic: data._introPic,
                body: data._body,
                tags: data._tags,
                publicationDate: getTime()
            });
        } else if (!data._subtitle && data._introPic) {
            console.log("no subtitle present, publishing post")
            newPost = new BlogPost({
                _id: data._id,
                title: data._title,
                username: package.username,
                introPic: data._introPic,
                body: data._body,
                tags: data._tags,
                publicationDate: getTime()
            });
        } else if (data._subtitle && !data._introPic) {
            console.log("no intro pic present, publishing post");
            newPost = new BlogPost({
                _id: data._id,
                title: data._title,
                username: package.username,
                subtitle: data._subtitle,
                body: data._body,
                tags: data._tags,
                publicationDate: getTime()
            });
        } else {
            newPost = new BlogPost({
                _id: data._id,
                title: data._title,
                username: package.username,
                body: data._body,
                tags: data._tags,
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
    console.log("name", name)
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
                console.log("numbersAffected: ", numbersAffected)
            }
        );
        res.json("post requested received, new comment added");
    } else if (name === "commentEdited") {
        console.log("data", data)
        const { _id, edits } = data;
        BlogPost.updateOne(
            {
                _id: postId,
                "comments._id": _id
            },
            {
                $set: {
                    "comments.$.comment": edits
                }
            },
            (error, numbersAffected) => {
                if (error) {
                    console.error(`Error message: ${error}`);
                }
                console.log("numbersAffected: ", numbersAffected)
            }
        );
        res.json("post requested received, commented updated");
    } else if (name === "newReply") {
        const { commentId } = req.body;
        console.log("data._id", data._id);
        BlogPost.updateOne(
            {
                _id: postId,
                "comments._id": commentId
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
                console.log("numbersAffected: ", numbersAffected)
            }
        )
        res.json("post requested received, reply added to comment");
    } else if (name === "editedReply") {
        const { replyId, commentId } = req.body;
        const { editedReply, updatedAt } = data;
        BlogPost.updateOne(
            {
                _id: postId,
                "comments._id": commentId
            },
            {
                $set:
                {
                    "comments.$.replies.$[reply].comment": editedReply,
                    "comments.$.replies.$[reply].updatedAt": updatedAt,
                }
            },
            {
                multi: false,
                arrayFilters: [{ "reply._id": replyId }]
            },
            (error, numbersAffected) => {
                if (error) throw error;
                else {
                    console.log("numbersAffected: ", numbersAffected);
                }
            }
        )
        res.json("post requested received, reply edited");
    }
})


router.route("/blogPosts/:package").get((req, res) => {
    console.log("get user's published posts")
    const package = JSON.parse(req.params.package);
    if (package.name === "getPublishedDrafts") {
        BlogPost.find({ username: package.username }).then(posts => {
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
    } else if (package.name === "getPost") {
        BlogPost.find({ _id: package.draftId }).then(post => {
            res.json(post[0]);
        })
    }
});


module.exports = router;