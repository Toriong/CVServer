const mongoose = require('mongoose');

const blogPostSchema = {
    id: String,
    authorIcon: String,
    authorIconAlt: String,
    blogPostsImages: [
        {
            main: String,
            alt: String
        }
    ],
    author: String,
    title: String,
    subTitle: String,
    body: String,
    datePublished: String,
    tags: {
        main: String,
        remaining: [String]
    }
}

// model instaniates a new blog post schema based upon the schema abovec
const BlogPost = mongoose.model('blogPost', blogPostSchema);

module.exports = BlogPost;
