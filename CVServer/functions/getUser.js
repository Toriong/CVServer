
const getUser = (users, userId) => users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(userId));

module.exports = {
    getUser
}