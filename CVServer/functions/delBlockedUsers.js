const { getUser } = require("./getUser");



// array can be the list of users that are in the CV database or all of the stories that are posted on the CV blog
const delBlockedUsers = (array, currentUser, users, isPostSearch) => array.filter(val => {
    const { blockedUsers, _id: currentUserId } = currentUser;
    const currentUserBlockedUsers = blockedUsers?.length && blockedUsers.map(({ userId }) => userId);
    console.table(currentUserBlockedUsers)
    const { authorId, _id } = val;
    console.log({ _id });
    const _userId = isPostSearch ? authorId : _id
    console.log({ _userId });
    const diffUser = getUser(users, _userId);
    if (diffUser) {
        const diffUserBlockedUsers = diffUser.blockedUsers?.length && diffUser.blockedUsers.map(({ userId }) => userId);
        const wasCurrentUserBlocked = diffUserBlockedUsers && diffUserBlockedUsers.includes(currentUserId);
        const wasDiffUserBlocked = currentUserBlockedUsers && (currentUserBlockedUsers.includes(_userId) || currentUserBlockedUsers.some(userId => JSON.stringify(userId) === JSON.stringify(_userId)))
        console.log({ wasDiffUserBlocked })
        if (wasDiffUserBlocked || wasCurrentUserBlocked) return false;
        return true;
    };
    return false;
});


module.exports = {
    delBlockedUsers
}