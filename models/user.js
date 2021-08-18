const mongoose = require('mongoose');


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
    isSignIn: Boolean,
    bio: String,
    topics: String,
    socialMedia: String,
    icon: String,
    blogPosts: String,
    isSign: Boolean
};

const User = mongoose.model("users", userSchema);

module.exports = User;

