
const User = require("../../models/user");
const router = require("../users");
const { getUser } = require("../../functions/getUser");




router.route("/checkStatusOfUser/:package").get((req, res) => {
    const package = JSON.parse(req.params.package);
    const { name, targetUserId, currentUserId, willCheckIfUserIsInChat, conversationId, username } = package;
    console.log('package: ', package);
    // well check if the target user blocked the current user, the current user blocked the target user, and the existence of the target user
    if (name === 'checkStatusOfUser') {
        User.find({ _id: { $in: [targetUserId, currentUserId] } }, { blockedUsers: 1, conversations: 1 }).then(usersResults => {
            const currentUser = getUser(usersResults, currentUserId);
            const targetUser = getUser(usersResults, targetUserId);
            console.log('currentUser: ', currentUser)
            console.log('targetUser: ', targetUser);
            if (targetUser) {
                const blockedUserIdsTargetUser = targetUser?.blockedUsers?.length && targetUser.blockedUsers.map(({ userId }) => userId)
                const currentUserBlockedUserIds = currentUser?.blockedUsers?.length && currentUser?.blockedUsers.map(({ userId }) => userId);
                let statuses = {
                    isCurrentUserBlocked: blockedUserIdsTargetUser?.length && blockedUserIdsTargetUser.includes(currentUserId),
                    isTargetUserBlocked: currentUserBlockedUserIds?.length && currentUserBlockedUserIds.includes(targetUserId)
                }
                if (willCheckIfUserIsInChat) {
                    const targetChat = currentUser.conversations.find(({ conversationId: _conversationId }) => conversationId === _conversationId)
                    const isTargetUserInChat = targetChat?.conversationUsers && targetChat.conversationUsers.includes(targetUserId)
                    statuses = {
                        ...statuses,
                        isCurrentUserInChat: !!targetChat,
                        isTargetUserInChat: !!isTargetUserInChat
                    };
                }
                console.log('statuses: ', statuses)
                res.json(statuses)
            } else {
                res.json({ doesUserNotExist: true });
            }
        })
    } else if (name === 'checkStatusByUsername') {
        User.findOne({ username: username }).countDocuments().then(doesUserExist => {
            res.json({ doesUserExist: !!doesUserExist })
        })
    }
}, error => {
    if (error) {
        console.error('An error has occurred: ', error)
    }
})

module.exports = router;