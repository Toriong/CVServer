
const checkIsUserBlocked = (userId, users) => {
    const { blockedUsers } = users.find(({ _id }) => _id === userId);
    return !(blockedUsers && blockedUsers.map(({ userId: _userId }) => _userId).includes(currentUserId))
}

module.exports = {
    checkIsUserBlocked
}