const express = require('express');
const router = express.Router();
const BlogPost = require('../models/blogPost');

// get == sends data
router.route("/blogPosts").get((req, res) => {
    res.send("hello from blogPosts api")
});

