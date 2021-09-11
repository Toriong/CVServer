const mongoose = require('mongoose');


// schema: allows us to define the field in a document that will be stored in the collection of the database
const userSchema = {
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
    roughDrafts: Array
};


// what is mongoose.model is doing?
// the first argument is hte name of the collection and the second argument is the schema that we defined
const User = mongoose.model("users", userSchema);

module.exports = User;

