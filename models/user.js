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
        following: Array,
        searchedHistory: Array
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
    _id: String,
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
    activitiesDeleted: Object,
    conversations: Array
});

// data structure for val in the conversation array: 

// for one-to-one conversations
// const conversationSingle = {
//     conversationId: 1, // the id of the conversation goes here, this will be the user who will receive the current user's messages
//     messages: [] // an array that will hold all of the messages for the conversation
// }


// send this data structure to all users that are in the conversationUsers
// const conversationGroup = {
//     conversationId: 1, // the id of the conversation goes here
//     conversationUsers: [], //the ids of the users that are in the convo
//     adMins: [], //this array will hold all of the users that are in charged of the group (starting with the user that started the group)
//     messages:[] //all of the messages in the group chat
// }

// the data structure for each message in the messages array will be as follows:

// for group messages
// const groupMessage = {
//     userId: 1, //the id of the user
//     text: "", //the text of the message
//     timeOfSend: {} // an object that will hold the following {miliSeconds, dateAndTime, time}
// }

// for one on one messages
// const oneOnOneMessage = {
//     byRecipient: false,// if true, then use the id of the user (the conversation id) to get the user info in the database 
//     text: "",
//     timeOfSend: {}
// }


const User = mongoose.model("users", userSchema);

module.exports = User;

