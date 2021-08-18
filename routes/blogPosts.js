const { request } = require('express');
const express = require('express');
const router = express.Router();
const BlogPost = require('../models/blogPost');

// get == sends data
// what is this code doing?
// this was suppose to store the dummy blogPost data that you created and store them into the database
// this is doing nothing
router.route("/blogPosts").post((req, res) => {
    console.log("blogPosts: request received")
    req.body.forEach(blogPost => {
        const blogPostImages_ = blogPost.blogPostsImages.map(image => image)
        const remainingTags = blogPost.tags.remaining.map(tag => tag);
        const blogPost_ = new BlogPost({
            authorIcon: blogPost.authorIcon,
            authorIconAlt: blogPost.authorIconAlt,
            author: blogPost.author,
            blogPostsImages: blogPostImages_,
            body: blogPost.body,
            title: blogPost.title,
            subTitle: blogPost.subTitle,
            datePublished: blogPost.datePublished,
            tags: {
                main: blogPost.tags.main,
                remaining: remainingTags
            }
        })

        blogPost_.save();
    })
    console.log("data saved")

    res.end();
});

//get the blogPost from the database and sends it to the Feed.js component
router.route("/blogposts").get((req, res) => {
    console.log("get all blog posts")
    BlogPost.find()
        .then(blogPost => res.json(blogPost))
});

module.exports = router;