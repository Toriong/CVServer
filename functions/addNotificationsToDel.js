// NOTES:
// implement logic that will track the user of likes that will be deleted:
// willDelUserReplyLikes
// willDelUserCommentLikes
// willDelUerPostLikes 

const addNotificationToDel = (notificationsToDel, itemIdForDel, fieldName) => {
    const targetNotificationForDel = notificationsToDel && notificationsToDel.find(({ willDelReplies, willDelReplyAuthors, willDelComments, willDelCommentAuthors, willDelPosts, willDelUserReplyLikes, willDelUserCommentLikes, willDelUserPostLikes }) => {
        if (((fieldName === 'willDelReplies') && willDelReplies) || ((fieldName === 'willDelReplyAuthors') && willDelReplyAuthors) ||
            ((fieldName === 'willDelComments') && willDelComments) || ((fieldName === 'willDelCommentAuthors') && willDelCommentAuthors) || ((fieldName === 'willDelPosts') && willDelPosts) || ((fieldName === 'willDelUserReplyLikes') && willDelUserReplyLikes) || (willDelUserCommentLikes && (fieldName === 'willDelUserCommentLikes')) || ((fieldName === 'willDelUserPostLikes') && willDelUserPostLikes)) {
            return true;
        };
    });
    let _notificationsToDel;
    if (targetNotificationForDel) {
        const isItemForDelPresent = targetNotificationForDel.itemsForDel.includes(itemIdForDel);
        if (!isItemForDelPresent) {
            _notificationsToDel = notificationsToDel.map(notificationToDel => {
                const { willDelReplies, willDelReplyAuthors, willDelCommentAuthors, willDelComments, willDelPosts, willDelUserReplyLikes, itemsForDel, willDelUserCommentLikes, willDelUserPostLikes } = notificationToDel;
                const _notificationsToDel = {
                    ...notificationToDel,
                    itemsForDel: [...itemsForDel, itemIdForDel]
                };

                if ((willDelReplies && (fieldName === 'willDelReplies')) || (willDelReplyAuthors && (fieldName === 'willDelReplyAuthors')) ||
                    (willDelComments && (fieldName === 'willDelComments')) || (willDelCommentAuthors && (fieldName === 'willDelCommentAuthors')) || ((fieldName === 'willDelPosts') && willDelPosts) ||
                    ((fieldName === 'willDelUserReplyLikes') && willDelUserReplyLikes) || (willDelUserCommentLikes && (fieldName === 'willDelUserCommentLikes')) || (willDelUserPostLikes && (fieldName === 'willDelUserPostLikes'))) {
                    return _notificationsToDel;
                }


                return notificationToDel;
            });

            // CASE1
            return _notificationsToDel;
        } else {
            // CASE 2: returns nothing since the reply is already present
            console.log('the item for deletion is present');
            return notificationsToDel;
        }
    } else {
        // FIRST OPTION: CASE 3
        // SECOND OPTION: CASE 4
        _notificationsToDel = notificationsToDel ? [...notificationsToDel, { [fieldName]: true, itemsForDel: [itemIdForDel] }] : [{ [fieldName]: true, itemsForDel: [itemIdForDel] }];

        return _notificationsToDel;
    }
}

module.exports = addNotificationToDel;