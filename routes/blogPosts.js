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


// GOAL: get the following data when the user presses the publish button on the front-end:
// title
// subtitle (if present)
// introPic
// body
// tags
// username of the user
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
})

module.exports = router;