const { request } = require('express');
const express = require('express');
const router = express.Router();
const BlogPost = require('../models/blogPost');


//get the blogPost from the database and sends it to the Feed.js component
router.route("/blogposts").get((req, res) => {
    console.log("get all blog posts")
    BlogPost.find()
        .then(blogPost => res.json(blogPost))
});

module.exports = router;