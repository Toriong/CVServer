const { getRandomArrayIndex } = require("../functions/getRandomArrayIndex");
const BlogPost = require("../models/blogPost");
const User = require("../models/user");
const router = require("./users");


router.route("/deleteUser").post((request, response) => {
    const { userToDeleteId } = request.body;
    let wasResponseSent;
    let wasPostsUpdated;
    let wasUserProfilesUpdated;
    let wasMessagesUpdated;
    // GOAL: check if server will get the request
    BlogPost.bulkWrite(
        [
            {
                // delete the posts
                deleteMany: {
                    'filter': { authorId: userToDeleteId }
                }
            },
            {
                // delete reply likes
                updateMany: {
                    'filter': { "comments.0.replies": { $exists: true } },
                    'update':
                    {
                        $pull: {
                            'comments.$[comment].replies.$[reply].userIdsOfLikes': { userId: userToDeleteId }
                        }
                    },
                    'arrayFilters': [{ 'comment.commentId': { $exists: true } }, { 'reply.replyId': { $exists: true } }]
                }
            },
            {
                // delete the comment likes
                updateMany: {
                    'filter': { "comments.0": { $exists: true } },
                    'update':
                    {
                        $pull: {
                            'comments.$[comment].userIdsOfLikes': { userId: userToDeleteId }
                        }
                    },
                    'arrayFilters': [{ 'comment.commentId': { $exists: true } }]
                }
            },
            {
                // delete the replies
                updateMany: {
                    'filter': { "comments.0.replies": { $exists: true } },
                    'update':
                    {
                        $pull: {
                            'comments.$[comment].replies': { userId: userToDeleteId }
                        }
                    },
                    'arrayFilters': [{ 'comment.commentId': { $exists: true } }]
                }
            },
            {
                // delete the comments 
                updateMany: {
                    'filter': { "comments.0": { $exists: true } },
                    'update':
                    {
                        $pull: {
                            'comments': { userId: userToDeleteId }
                        }
                    }
                }
            },
            {
                // delete the post like made by the user that was deleted
                updateMany: {
                    'filter': { "userIdsOfLikes.0": { $exists: true } },
                    'update':
                    {
                        $pull: {
                            userIdsOfLikes: { userId: userToDeleteId }
                        }
                    }
                }
            }
        ]
    )
        .then(() => {
            console.log('BulkWrite is done.');
            wasPostsUpdated = true
            if (wasPostsUpdated && wasUserProfilesUpdated && wasMessagesUpdated) {
                !wasResponseSent &&
                    response.sendStatus(200);
                wasResponseSent = true;
            }
        })
        .catch(error => {
            if (error) {
                console.error('An error has occurred in deleting all material on feed that is by the deleted user: ', error);
                response.sendStatus(503)
            };
        })

    User.findOne({ _id: userToDeleteId }, { conversations: 1 }).then(({ conversations }) => {
        if (conversations) {
            let conversationBulkWrites;
            conversations.forEach(conversation => {
                const { conversationUsers, adMins, conversationId } = conversation;
                let _conversationUsers;
                const isDeletedUserMainAdmin = adMins && adMins.find(({ userId }) => userId === userToDeleteId)?.isMain;
                if (isDeletedUserMainAdmin && (adMins?.length > 1)) {
                    let _adMins = adMins.filter(({ userId }) => userId !== userToDeleteId);
                    const newMainAdmin = _adMins[getRandomArrayIndex(_adMins.length)];
                    _adMins = _adMins.map(user => {
                        if (user.userId === newMainAdmin.userId) {
                            return {
                                ...user,
                                isMain: true
                            }
                        };

                        return user;
                    })
                    _conversationUsers = conversationUsers.filter(userId => userId !== userToDeleteId);
                    const updateManyObj = {
                        updateMany: {
                            'filter': { _id: { $in: _conversationUsers } },
                            'update': {
                                $set: {
                                    'conversations.$[conversation].adMins': _adMins,
                                    'conversations.$[conversation].conversationUsers': _conversationUsers
                                }
                            },
                            'arrayFilters': [{ 'conversation.conversationId': conversationId }]
                        }
                    }

                    conversationBulkWrites = conversationBulkWrites ? [...conversationBulkWrites, updateManyObj] : [updateManyObj];
                } else if (isDeletedUserMainAdmin && (conversationUsers.length > 1)) {
                    _conversationUsers = conversationUsers.filter(userId => userId !== userToDeleteId);
                    const newMainAdminId = _conversationUsers[getRandomArrayIndex(_conversationUsers.length)]
                    const _adMins = [{ userId: newMainAdminId, isMain: true }]
                    const updateManyObj = {
                        updateMany: {
                            'filter': { _id: { $in: _conversationUsers } },
                            'update': {
                                $set: {
                                    'conversations.$[conversation].adMins': _adMins,
                                    'conversations.$[conversation].conversationUsers': _conversationUsers
                                }
                            },
                            'arrayFilters': [{ 'conversation.conversationId': conversationId }]
                        }
                    }

                    conversationBulkWrites = conversationBulkWrites ? [...conversationBulkWrites, updateManyObj] : [updateManyObj];
                } else if (conversationUsers?.length > 1) {
                    _conversationUsers = conversationUsers.filter(userId => userId !== userToDeleteId)
                    const _adMins = adMins.filter(({ userId }) => userId !== userToDeleteId);
                    const updateManyObj = {
                        updateMany: {
                            'filter': { _id: { $in: _conversationUsers } },
                            'update': {
                                $set: {
                                    'conversations.$[conversation].adMins': _adMins,
                                    'conversations.$[conversation].conversationUsers': _conversationUsers
                                }
                            },
                            'arrayFilters': [{ 'conversation.conversationId': conversationId }]
                        }
                    }

                    conversationBulkWrites = conversationBulkWrites ? [...conversationBulkWrites, updateManyObj] : [updateManyObj];
                }
            });
            if (conversationBulkWrites) {
                User.bulkWrite(conversationBulkWrites).then(() => {
                    console.log('Conversations for users has been updated.')
                    wasMessagesUpdated = true;
                    if (wasPostsUpdated && wasUserProfilesUpdated && wasMessagesUpdated) {
                        !wasResponseSent && response.sendStatus(200);
                        wasResponseSent = true
                    }
                }).catch(error => {
                    if (error) {
                        console.error('An error has occurred in updating conversations of users: ', error)
                    }
                })
            }
        } else {
            console.log('No conversations for deleted user.')
        }
    }).catch(error => {
        if (error) {
            console.error('An error has occurred: ', error)
        }
    })

    User.findOne({ _id: userToDeleteId }, { followers: 1, "activities.following": 1 }).then(user => {
        const { followers, activities } = user;
        const deleteUserObj = { deleteOne: { 'filter': { _id: userToDeleteId } } };
        let bulkWriteUpdates;

        if (followers?.length) {
            const userToDeleteFollowers = followers.map(({ userId }) => userId);
            const pullUserFromFollowingObj = {
                updateMany: {
                    'filter': { _id: { $in: userToDeleteFollowers } },
                    'update':
                    {
                        $pull: {
                            'activities.following': { userId: userToDeleteId }
                        }
                    }
                }
            };
            bulkWriteUpdates = [pullUserFromFollowingObj]
        }

        if (activities?.following?.length) {
            // if userA is being followed by the deleted user, then delete the deleted user from the array that is stored in followers 
            const userToDeleteFollowing = activities.following.map(({ userId }) => userId)
            const pullUserFromFollowersObj = {
                updateMany: {
                    'filter': { _id: { $in: userToDeleteFollowing } },
                    'update':
                    {
                        $pull: {
                            'followers': { userId: userToDeleteId }
                        }
                    }
                }
            }
            bulkWriteUpdates = bulkWriteUpdates ? [...bulkWriteUpdates, pullUserFromFollowersObj] : [pullUserFromFollowersObj]
        };


        bulkWriteUpdates = bulkWriteUpdates ? [...bulkWriteUpdates, deleteUserObj] : [deleteUserObj]

        console.log('bulkWriteUpdates: ')
        console.table(bulkWriteUpdates)
        User.bulkWrite(bulkWriteUpdates)
            .then(() => {
                console.log('BulkWrite completed.')
                wasUserProfilesUpdated = true
                if (wasPostsUpdated && wasUserProfilesUpdated && wasMessagesUpdated) {
                    !wasResponseSent &&
                        response.sendStatus(200);
                    wasResponseSent = true
                }
            })
            .catch(error => {
                if (error) {
                    console.error('An error has occurred in inserting dummy data into the collection of user into the DB: ', error);
                }
            })
    }).catch(error => {
        if (error) {
            console.error('An error has occurred in getting target user to delete: ', error)
            !wasError &&
                response.sendStatus(503);
            wasError = true;
        };
    })
}, error => {
    if (error) {
        console.error('An error has occurred: ', error)
    }
})









module.exports = router;
