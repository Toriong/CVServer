const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const idSchema = new Schema(
    {
        _id: String
    }
)





// have the wasUpdated field be stored into every single element in the elements in the replyId field
const repliedToCommentsSchema = new Schema(
    {
        // the _id will be the post 
        _id: String,
        idsOfCommentsRepliedTo: [idSchema]
    },
);

const likeSchema = new Schema(
    {
        posts: Array,
        comments: Array,
        replies: Array
    },
)



const activitiesSchema = new Schema(
    {
        comments: [idSchema],
        replies: [repliedToCommentsSchema],
        likes: likeSchema
    }
);


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
    activities: activitiesSchema
});


// what is mongoose.model is doing?
// the first argument is hte name of the collection and the second argument is the schema that we defined
const User = mongoose.model("users", userSchema);

module.exports = User;

