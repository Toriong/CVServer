const { getUser } = require("../../functions/getUser");
const BlogPost = require("../../models/blogPost");
const Tag = require("../../models/tag");
const User = require("../../models/user");
const router = require("../users");



router.route("/getAllBlogPosts/:package").get((req, res) => {
    console.log("get user's published posts");
    const package = JSON.parse(req.params.package);
    console.log('package: ', package);
    const { name, userId, draftId, savedPosts, postId, username } = package;

    BlogPost.find()
        .then(blogPosts => {
            let userIds = [];
            blogPosts.forEach(({ authorId, comments, userIdsOfLikes }) => {
                !userIds.includes(authorId) && userIds.push(authorId);
                if (comments.length) {
                    comments.forEach(comment => {
                        const { userId: commentUserId, replies, userIdsOfLikes: commentLikes } = comment;
                        !userIds.includes(commentUserId) && userIds.push(commentUserId);
                        if (commentLikes?.length) {
                            commentLikes.forEach(({ userId: commentLikeUserId }) => {
                                !userIds.includes(commentLikeUserId) && userIds.push(commentLikeUserId);
                            })
                        };
                        if (replies?.length) {
                            replies.forEach(reply => {
                                const { userId: replyUserId, userIdsOfLikes: replyLikes } = reply;
                                !userIds.includes(replyUserId) && userIds.push(replyUserId);
                                if (replyLikes?.length) {
                                    replyLikes.forEach(({ userId: replyLikeUserId }) => {
                                        !userIds.includes(replyLikeUserId) && userIds.push(replyLikeUserId);
                                    })
                                }
                            })
                        }
                    })
                }
                if (userIdsOfLikes?.length) {
                    userIdsOfLikes.forEach(({ userId }) => {
                        !userIds.includes(userId) && userIds.push(userId);
                    })
                }
            });
            User.find({ _id: { $in: [...userIds, userId] } }, { blockedUsers: 1, topics: 1 }).then(users => {
                const currentUser = getUser(users, userId);
                const currentUserBlockedUserIds = !!currentUser?.blockedUsers?.length && currentUser.blockedUsers.map(({ userId }) => userId)
                let _blogPosts = blogPosts.filter(({ authorId }) => {
                    const postAuthor = getUser(users, authorId)
                    const isCurrentUserBlocked = postAuthor?.blockedUsers?.length && !!postAuthor.blockedUsers.find(({ userId: _userId }) => userId === _userId)
                    const didCurrentUserBlockedAuthor = currentUserBlockedUserIds && currentUserBlockedUserIds.includes(authorId)
                    if (isCurrentUserBlocked || didCurrentUserBlockedAuthor) return false
                    return true;
                })

                if (_blogPosts?.length) {
                    _blogPosts = _blogPosts.map(post => {
                        const { userIdsOfLikes, comments } = post;
                        // filter out all users of likes that were blocked by the current user or blocked the current user
                        const _userIdsOfLikes = userIdsOfLikes.filter(({ userId: postLikeUserId }) => {
                            const userOfLike = getUser(users, postLikeUserId)
                            const isCurrentUserBlocked = userOfLike?.blockedUsers?.length && !!userOfLike.blockedUsers.find(({ userId: _userId }) => userId === _userId)
                            const didCurrentUserBlockedLikeUser = currentUserBlockedUserIds && currentUserBlockedUserIds.includes(postLikeUserId)
                            if (isCurrentUserBlocked || didCurrentUserBlockedLikeUser) return false
                            return true;
                        });
                        let _comments;
                        if (comments?.length) {
                            // filter out all comment users that either were blocked by the current user or blocked the current user
                            _comments = comments.filter(({ userId: commentUserId }) => {
                                const userOfComment = getUser(users, commentUserId)
                                const isCurrentUserBlocked = userOfComment?.blockedUsers?.length && !!userOfComment.blockedUsers.find(({ userId: _userId }) => userId === _userId)
                                const didCurrentUserBlockedCommentUser = currentUserBlockedUserIds && currentUserBlockedUserIds.includes(commentUserId)
                                if (isCurrentUserBlocked || didCurrentUserBlockedCommentUser) return false
                                return true;
                            })
                        };

                        return _comments ? { ...post._doc, comments: _comments, userIdsOfLikes: _userIdsOfLikes } : { ...post._doc, userIdsOfLikes: _userIdsOfLikes }
                    });
                    Tag.find({}, { _id: 1, topic: 1 }).then(tags => {
                        _blogPosts = _blogPosts.map(post => {
                            const { comments, tags: _postTags } = post
                            if (comments?.length) {
                                const postTags = _postTags.map(tag => {
                                    const { isNew, _id: tagId } = tag;
                                    if (!isNew) {
                                        // ASK A QUESTION ON STACK OVERFLOW ABOUT THIS CODE 
                                        let tag = tags.find(({ _id }) => JSON.parse(JSON.stringify(tagId)) === JSON.parse(JSON.stringify(_id)));
                                        tag = JSON.parse(JSON.stringify(tag));
                                        return {
                                            ...tag,
                                            isLiked: currentUser.topics.includes(tagId),
                                            topic: tag?.topic
                                        }
                                    };

                                    return tag;
                                });
                                return {
                                    ...post,
                                    tags: postTags,
                                    comments: post.comments.map(comment => {
                                        const { userIdsOfLikes, replies } = comment;
                                        let _userIdsOfLikes;
                                        let _replies
                                        let _comment = { ...comment }
                                        if (userIdsOfLikes?.length) {
                                            // filter all users of the comment likes array that either were blocked by the current user or has blocked the current user
                                            _userIdsOfLikes = userIdsOfLikes.filter(({ userId: commentLikeUserId }) => {
                                                const commentLikeUser = getUser(users, commentLikeUserId)
                                                const isCurrentUserBlocked = commentLikeUser?.blockedUsers?.length && !!commentLikeUser.blockedUsers.find(({ userId: _userId }) => userId === _userId)
                                                const didCurrentUserBlockedCommentUser = currentUserBlockedUserIds && currentUserBlockedUserIds.includes(commentLikeUserId)
                                                if (isCurrentUserBlocked || didCurrentUserBlockedCommentUser) return false
                                                return true;
                                            })
                                        };
                                        if (replies?.length) {
                                            // filter all users of the reply array that either were blocked by the current user or has blocked the current user
                                            _replies = replies.filter(({ userId: replyUserId }) => {
                                                const replyUser = getUser(users, replyUserId)
                                                const isCurrentUserBlocked = replyUser?.blockedUsers?.length && !!replyUser.blockedUsers.find(({ userId: _userId }) => userId === _userId)
                                                const didCurrentUserBlockedReplyUser = currentUserBlockedUserIds && currentUserBlockedUserIds.includes(replyUserId)
                                                if (isCurrentUserBlocked || didCurrentUserBlockedReplyUser) return false
                                                return true;
                                            });
                                            if (_replies?.length) {
                                                // filter all users that of the reply likes that either were blocked by the current user or has the current user blocked 
                                                _replies = _replies.map(reply => {
                                                    if (reply?.userIdsOfLikes?.length) {
                                                        return {
                                                            ...reply,
                                                            userIdsOfLikes: reply.userIdsOfLikes.filter(({ userId: replyUserId }) => {
                                                                const replyUser = getUser(users, replyUserId)
                                                                const isCurrentUserBlocked = replyUser?.blockedUsers?.length && !!replyUser.blockedUsers.find(({ userId: _userId }) => userId === _userId)
                                                                const didCurrentUserBlockedReplyUser = currentUserBlockedUserIds && currentUserBlockedUserIds.includes(replyUserId)
                                                                if (isCurrentUserBlocked || didCurrentUserBlockedReplyUser) return false
                                                                return true;
                                                            })
                                                        }
                                                    };

                                                    return reply
                                                })
                                            }
                                        };

                                        if (_replies) {
                                            _comment = {
                                                ..._comment,
                                                replies: _replies
                                            }
                                        };
                                        if (_userIdsOfLikes) {
                                            _comment = {
                                                ..._comment,
                                                userIdsOfLikes: _userIdsOfLikes
                                            }
                                        }

                                        return _comment;
                                    })
                                }
                            };
                            // GOAL: insert the isLiked field into each tag if the tag was liked by the current user
                            // the field isLiked is inserted into the tag
                            // the tagId is found in the user liked tags
                            // for each tag check if its id is found in the user's liked tags array
                            // get the current user liked tags array
                            // get the current user from the users array



                            return {
                                ...post,
                                tags: _postTags.map(tag => {
                                    const { isNew, _id: tagId } = tag;
                                    if (!isNew) {
                                        let tag = tags.find(({ _id }) => JSON.parse(JSON.stringify(tagId)) === JSON.parse(JSON.stringify(_id)));
                                        tag = JSON.parse(JSON.stringify(tag));

                                        return {
                                            ...tag,
                                            isLiked: currentUser.topics.includes(tagId),
                                            topic: tag.topic
                                        }
                                    };

                                    return tag;
                                })
                            };
                        });
                        res.json(_blogPosts)
                    })

                } else {
                    res.json({ isEmpty: true })
                }




            })
        })


}, error => {
    if (error) {
        console.error('An error has occurred in getting all posts to display on feed: ', error)
    }
});

module.exports = router;
