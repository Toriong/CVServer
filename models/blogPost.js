const mongoose = require('mongoose');

const blogPostSchema = {
    _id: String,
    username: String,
    title: String,
    subtitle: String,
    introPic: Object,
    body: String,
    tags: Array,
    publicationDate: Object

};


// model instantiates a new blog post schema based upon the schema above
const BlogPost = mongoose.model('blogPost', blogPostSchema);

module.exports = BlogPost;
