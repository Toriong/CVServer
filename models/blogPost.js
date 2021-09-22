const mongoose = require('mongoose');


// how to created schema's with nested arrays
const blogPostSchema = {
    _id: String,
    username: String,
    title: String,
    subtitle: String,
    introPic: Object,
    body: String,
    tags: Array,
    publicationDate: Object,
    comments: Array

};


// model instantiates a new blog post schema based upon the schema above
const BlogPost = mongoose.model('blogPost', blogPostSchema);

module.exports = BlogPost;
