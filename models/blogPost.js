const Mongoose = require('mongoose');


const ReplySchema = new Mongoose.Schema(
    {
        _id: String,
        userId: String,
        comment: String,
        createdAt: Object,
        updatedAt: Object
    }
)

const CommentSchema = new Mongoose.Schema(
    {
        _id: String,
        userId: String,
        comment: String,
        createdAt: Object,
        updatedAt: Object,
        replies: [ReplySchema]
    }
)


// how to created schema's with nested arrays
const BlogPostSchema = new Mongoose.Schema(
    {
        _id: String,
        username: String,
        title: String,
        subtitle: String,
        introPic: Object,
        body: String,
        tags: Array,
        publicationDate: Object,
        comments: [CommentSchema]
    }
)


// model instantiates a new blog post schema based upon the schema above
const BlogPost = Mongoose.model('blogPost', BlogPostSchema);

module.exports = BlogPost;
