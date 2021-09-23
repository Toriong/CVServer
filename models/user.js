const mongoose = require('mongoose');
const Schema = mongoose.Schema;


// the object for the activity field will be the following:
// the comments that the user posted:
// this will be an array an each array will 

const commentSchema = new Schema({
    postId: String,
    commentId: String,
    wasUpdated: Boolean
})

const replySchema = new Schema({
    postId: String,
    commentId: String,
    replyId: String,
    wasUpdated: Boolean
});

const likeSchema = new Schema({
    name: String,
    postId: String,
    commentId: String,
    replyId: String
})



const activitySchema = new Schema({
    comments: [commentSchema],
    replies: [replySchema],
    likes: [likeSchema]
});


// schema: allows us to define the field in a document that will be stored in the collection of the database
const userSchema = new Schema({
    id: String,
    firstName: String,
    lastName: String,
    userName: String,
    password: String,
    belief: String,
    sex: String,
    reasonsToJoin: String,
    email: String,
    phoneNum: String,
    bio: String,
    topics: Array,
    socialMedia: Array,
    icon: String,
    blogPosts: String,
    isSignedIn: Boolean,
    isUserNew: Boolean,
    roughDrafts: Array,
    publishedDrafts: Array,
    activities: activitySchema
});


// what is mongoose.model is doing?
// the first argument is hte name of the collection and the second argument is the schema that we defined
const User = mongoose.model("users", userSchema);

module.exports = User;

