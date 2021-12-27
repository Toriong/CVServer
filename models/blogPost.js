const Mongoose = require('mongoose');


const ReplySchema = new Mongoose.Schema(
    {
        _id: String,
        userId: String,
        _reply: String,
        userIdsOfLikes: Array,
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
        userIdsOfLikes: Array,
        replies: Array
    }
)

// const idSchema = new Mongoose.Schema({
//     _id: String
// })

// how to created schema's with nested arrays
const BlogPostSchema = new Mongoose.Schema(
    {
        _id: String,
        title: String,
        subtitle: String,
        imgUrl: String,
        body: String,
        tags: Array,
        publicationDate: Object,
        comments: Array,
        userIdsOfLikes: Array,
        authorId: String,
        editedPost: Object,
        previousVersions: Array,
        editsPublishedAt: Object
    }
)


// model instantiates a new blog post schema based upon the schema above
const BlogPost = Mongoose.model('blogPost', BlogPostSchema);

module.exports = BlogPost;
