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
        replies: Array,
        following: Array
    },
)



const activitiesSchema = new Schema(
    {
        comments: Array,
        replies: Array,
        likes: Object,
        following: Array
    }
);

const notificationsSchema = new Schema(
    {
        replies: Array,
        comments: Array,
        likes: Object,
        newFollower: Array,
        followingNewPost: Array
    }
);




// schema: allows us to define the field in a document that will be stored in the collection of the database
const userSchema = new Schema({
    id: String,
    isUserNew: Boolean,
    firstName: String,
    lastName: String,
    username: String,
    password: String,
    belief: String,
    sex: String,
    reasonsToJoin: String,
    email: String,
    phoneNum: String,
    bio: String,
    topics: Array,
    socialMedia: Array,
    iconPath: String,
    blogPosts: String,
    roughDrafts: Array,
    publishedDrafts: Array,
    activities: activitiesSchema,
    followers: Array,
    readingLists: Object,
    blockedUsers: Array,
    notifications: Object,
    deleteActivities: Object
});

// deleteActivities will consist of the following: {ids of replies, ids of comments,ids of posts by user, ids of liked replies, ids of liked comments, ids of liked posts, for reading list, don't show it if the user request to delete the log from their activity log (store a boolean that will determine whether or not to sho the reading list activity),  }


// what is mongoose.model is doing?
// the first argument is hte name of the collection and the second argument is the schema that we defined
const User = mongoose.model("users", userSchema);

module.exports = User;

