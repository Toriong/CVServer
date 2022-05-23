

// NOTES:
// creat a callback function that will be applied to each val in the replies field 
// Create a call back function for the map method 
// create a function that will delete the designated value that doesn't exist: (make a function that will delete the replyIds that don't exist )
// make sure do checks for each aspect of a pos, do the following checks:
// if the post exist. proceed
// if the comment author exist, proceed
// if the comment exist, proceed
// if the reply author exist, proceed
// if the reply id exist, get the reply id 

// BUG:
// for the replies 






const delNonexistentReplies = (notifications, replyIds) => {
    const _notifications = notifications.map(notification => {
        const _repliesInfo = notification.repliesInfo.map(replyInfo => {
            const _commentsRepliedTo = replyInfo.commentsRepliedTo.map(comment => {
                const _replies = comment.replies.map(reply => {
                    const _replyIds = reply.replyIds.filter(({ id }) => !replyIds.includes(id));

                    return {
                        ...reply,
                        replyIds: _replyIds
                    };
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

    return _notifications;
};

const delNonexistentReplyAuthors = (notifications, replyAuthorIds) => {
    const _notifications = notifications.map(notification => {
        const _repliesInfo = notification.repliesInfo.map(replyInfo => {
            const _commentsRepliedTo = replyInfo.commentsRepliedTo.map(comment => {
                const _replies = comment.replies.filter(({ authorId }) => !replyAuthorIds.includes(authorId));

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

    return _notifications;
};

// comm = comment
const delNonexistentCommAuthors = (notifications, commentAuthorIds) => {
    const _notifications = notifications.map(notification => {
        const _repliesInfo = notification.repliesInfo.filter(({ commentAuthorId }) => !commentAuthorIds.includes(commentAuthorId));

        return {
            ...notification,
            repliesInfo: _repliesInfo
        }
    });

    return _notifications;
}

const delNonexistentComms = (notifications, commentIds) => {
    const _notifications = notifications.map(notification => {
        const _repliesInfo = notification.repliesInfo.map(replyInfo => {
            const _commentsRepliedTo = replyInfo.commentsRepliedTo.filter(({ id: commentId }) => !commentIds.includes(commentId));

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

    return _notifications;
};

const delNonexistentPosts = (notifications, postIds) => notifications.filter(({ postId }) => !postIds.includes(postId));




module.exports = {
    delNonexistentReplies,
    delNonexistentReplyAuthors,
    delNonexistentCommAuthors,
    delNonexistentComms,
    delNonexistentPosts
};