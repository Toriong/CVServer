

const checkForBlockedUsers = (users, array, currentUser) => array.filter(val => {
    const { _id: currentUserId, blockedUsers } = currentUser;
    const currentUserBlockedUserIds = blockedUsers?.length && blockedUsers.map(({ userId }) => userId);
    const { _id: targetUserId, blockedUsers: targetUserBlockedUsers } = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(val.userId)) || {};
    const targetUserBlockedUserIds = targetUserBlockedUsers?.length && targetUserBlockedUsers.map(({ userId }) => userId);
    if ((targetUserBlockedUserIds && targetUserBlockedUserIds.includes(currentUserId)) || (currentUserBlockedUserIds && currentUserBlockedUserIds.includes(targetUserId))) return false;
    return true;
})

const addUserInfoToPosts = (allPosts, users, currentUser, allTags) => {
    const { topics: likedTopicIds, readingLists, blockedUsers, activities } = currentUser;
    const userFollowings = activities?.following?.length && activities.following
    const savedPosts = readingLists && Object.values(readingLists).map(({ list }) => list).flat();
    return allPosts.map(post => {
        const { userIdsOfLikes, comments, authorId, tags, _id: postId, title, subtitle, imgUrl, publicationDate, body, isPostPresent } = post;
        let likedTags = [];
        let unLikedTags = [];
        tags.forEach(tag => {
            if (likedTopicIds.includes(tag._id)) {
                const postTag = allTags.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(tag._id))
                likedTags.push({ ...(postTag._doc ?? postTag), isLiked: true });
            } else {
                const postTag = allTags.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(tag._id))
                unLikedTags.push(postTag ?? tag);
            }
        })
        const _tags = likedTags.length ? [...likedTags, ...unLikedTags] : unLikedTags;
        const { username, iconPath } = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(authorId));
        let _post = { title, subtitle, imgUrl, publicationDate, username, iconPath, tags: _tags, body, isPostPresent, _id: postId, authorId };
        let postLikes = (userIdsOfLikes && userIdsOfLikes.length) && checkForBlockedUsers(users, userIdsOfLikes, currentUser);
        let _comments = (blockedUsers?.length && comments?.length) ? checkForBlockedUsers(users, comments, currentUser) : comments
        const totalComments = (_comments && _comments.length) ? _comments.reduce((_commentsRepliesTotal, comment) => { return _commentsRepliesTotal + ((comment?.replies?.length ?? 0) + 1); }, 0) : 0;
        const wasPostSaved = savedPosts && savedPosts.map(({ postId }) => postId).includes(postId);
        const isFollowingAuthor = userFollowings?.length && userFollowings.map(({ userId }) => userId).includes(authorId);
        if (wasPostSaved) {
            _post = { ..._post, wasPostSaved };
        }

        if (totalComments) {
            _post = { ..._post, totalComments };
        }

        if (isFollowingAuthor) {
            _post = { ..._post, isFollowingAuthor };
        }

        if (comments?.length) {
            _comments = checkForBlockedUsers(users, comments, currentUser);
            _comments = _comments.length ? _comments.map(comment => {
                const { replies, userIdsOfLikes } = comment;
                let _replies;
                let commentLikes;
                let _comment;
                if (replies?.length) {
                    _replies = checkForBlockedUsers(users, replies, currentUser);
                    _replies = _replies.length ?
                        _replies.map(reply => {
                            if (reply?.userIdsOfLikes?.length) {
                                return {
                                    ...reply,
                                    userIdsOfLikes: checkForBlockedUsers(users, reply.userIdsOfLikes, currentUser)
                                }
                            }

                            return reply;
                        })
                        :
                        _replies;
                };
                if (userIdsOfLikes?.length) {
                    commentLikes = checkForBlockedUsers(users, userIdsOfLikes, currentUser)
                }
                if (_replies) {
                    _comment = { ...comment, replies: _replies }
                }
                if (commentLikes) {
                    _comment = _comment ? { ..._comment, userIdsOfLikes: commentLikes } : { ...comment, userIdsOfLikes: commentLikes }
                }
                return _comment ?? comment
            })
                :
                _comments;
        };

        if (postLikes) {
            _post = { ..._post, userIdsOfLikes: postLikes };
        }

        if (_comments) {
            _post = { ..._post, comments: _comments };
        }
        delete _post.comments

        return _post
    });
}

module.exports = {
    addUserInfoToPosts
}
