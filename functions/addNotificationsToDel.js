const addNotificationToDel = (notificationsToDel, replyId) => {
    const willDelReplies = notificationsToDel && notificationsToDel.find(({ willDelReplies }) => !!willDelReplies);
    let _notificationsToDel;
    if (willDelReplies) {
        const isReplyPresent = willDelReplies.repliesToDel.includes(replyId);
        if (!isReplyPresent) {
            _notificationsToDel = notificationsToDel.map(notificationToDel => {
                const { willDelReplies, repliesToDel } = notificationToDel;
                if (willDelReplies) {
                    return {
                        ...notificationToDel,
                        repliesToDel: [...repliesToDel, replyId]
                    };
                };

                return notificationToDel;
            });

            // CASE 1
            return _notificationsToDel;
        } else {
            // CASE 2: returns nothing since the reply is already present
            console.log('the reply is present');
        }
    } else {
        // FIRST OPTION: CASE 3
        // SECOND OPTION: CASE 4
        _notificationsToDel = notificationsToDel ? [...notificationsToDel, { willDelReplies: true, repliesToDel: [replyId] }] : [{ willDelReplies: true, repliesToDel: [replyId] }];

        return _notificationsToDel;
    }
}

module.exports = addNotificationToDel;