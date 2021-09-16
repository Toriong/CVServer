const { request } = require('express');
const express = require('express');
const router = express.Router();
const BlogPost = require('../models/blogPost');
const getTime = require("../functions/getTime");


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

// GOAL: get the posts of the specific user
// get the username of the user 
// get all of the drafts that has username of the user
// send it back to the front-end

router.route("/blogPosts/:package").get((req, res) => {
    console.log("get user's published posts")
    const package = JSON.parse(req.params.package);
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
});


module.exports = router;