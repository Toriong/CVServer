
// GOAL: delete all of the comments, posts, replies, authors of replies, and/or authors of comments that don't exist
const delNonexistentValues = (notifications, delNotifications) => {
    let _notifications = notifications;
    delNotifications.forEach(delNotification => {
        const { willDelPosts, willDelComments, willDelCommentAuthors, willDelReplies, willDelReplyAuthors, itemsToDel } = delNotification;
        if (willDelReplies) {
            _notifications = _notifications.map(notification => {
                const _repliesInfo = notification.repliesInfo.map(replyInfo => {
                    const _commentsRepliedTo = replyInfo.commentsRepliedTo.map(comment => {
                        const _replies = comment.replies.map(reply => {
                            const _replyIds = reply.replyIds.filter(({ id }) => !itemsToDel.includes(id));

                            return {
                                ...reply,
                                replyIds: _replyIds
                            }
                        });

                        return {
                            ...comment,
                            replies: _replies
                        }
                    });

                    return {
                        ...replyInfo,
                        commentsRepliedTo: _commentsRepliedTo
                    }
                });

                return {
                    ...notification,
                    repliesInfo: _repliesInfo
                }
            });
            // GOAL: IF THE reply author doesn't exist, then delete the reply author from the _notifications array 
        } else if (willDelReplyAuthors) {
            _notifications = _notifications.map(notification => {
                const _repliesInfo = notification.repliesInfo.map(replyInfo => {
                    const _commentsRepliedTo = replyInfo.commentsRepliedTo.map(comment => {
                        const _replies = comment.replies.filter(({ authorId }) => !itemsToDel.includes(authorId));

                        return {
                            ...comment,
                            replies: _replies
                        }
                    });

                    return {
                        ...replyInfo,
                        commentsRepliedTo: _commentsRepliedTo
                    }
                });

                return {
                    ...notification,
                    repliesInfo: _repliesInfo
                }
            });
        } else if (willDelComments) {
            _notifications = _notifications.map(notification => {
                const _repliesInfo = notification.repliesInfo.map(replyInfo => {
                    const _commentsRepliedTo = replyInfo.commentsRepliedTo.map(({ id: commentId }) => !itemsToDel.includes(commentId));

                    return {
                        ...replyInfo,
                        commentsRepliedTo: _commentsRepliedTo
                    }
                });

                return {
                    ...notification,
                    repliesInfo: _repliesInfo
                }
            });
        } else if (willDelCommentAuthors) {
            _notifications = _notifications.map(notification => {
                const _repliesInfo = notification.repliesInfo.filter(({ commentAuthorId }) => !itemsToDel.includes(commentAuthorId));

                return {
                    ...notification,
                    repliesInfo: _repliesInfo
                }
            });
        } else if (willDelPosts) {
            _notifications = _notifications.filter(({ postId }) => !itemsToDel.includes(postId));
        };
    })

    return _notifications;
};


module.exports = delNonexistentValues;