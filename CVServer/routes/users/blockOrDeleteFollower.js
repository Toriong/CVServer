
const User = require("../../models/user");
const router = require("../users");




router.route("/blockOrDeleteFollower").post((req, res) => {
    const { deletedUserId, isBlocked, blockedAt, isFollowing, isAFollower, currentUserId } = req.body;
    console.log('hello there meng');
    console.log('req.body: ', req.body)
    if (isBlocked && isFollowing && isAFollower) {
        console.log('user is being removed, blocked, and unFollowed.')
        User.updateOne(
            { _id: currentUserId },
            {
                $pull:
                {
                    followers: { userId: deletedUserId },
                    "activities.following": { userId: deletedUserId }
                },
                $push:
                {
                    blockedUsers: { userId: deletedUserId, blockedAt }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting and blocking target user: ', error);
                } else {
                    console.log('User was deleted as a follower and is no longer being followed by current user and is blocked, numsAffected: ', numsAffected);
                };
            }
        );
        User.updateOne(
            { _id: deletedUserId },
            {
                $pull:
                {
                    followers: { userId: currentUserId }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting following: ', error);
                } else {
                    console.log('Current user was deleted as a follower from the blocked the blocked user. NumsAffected: ', numsAffected);
                };
            }
        );
    } else if (isBlocked && isFollowing) {
        console.log('user is being removed as a follower  and blocked.')
        User.updateOne(
            { _id: userId },
            {
                $pull:
                {
                    "activities.following": { userId: deletedUserId }
                },
                $push:
                {
                    blockedUsers: { userId: deletedUserId, blockedAt }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting and blocking follower: ', error);
                } else {
                    console.log('Target user is no longer being followed by current user and is blocked by current user, numsAffected: ', numsAffected);
                };
            }
        );
        User.updateOne(
            { _id: deletedUserId },
            {
                $pull:
                {
                    followers: { userId: currentUserId }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting following: ', error);
                } else {
                    console.log('Current use was deleted as a follower from the blocked and deleted user, numsAffected: ', numsAffected);
                };
            }
        );
    } else if (isBlocked && isAFollower) {
        console.log('user is being removed.')
        User.updateOne(
            { _id: userId },
            {
                $pull: {
                    followers: { userId: deletedUserId }
                },
                $push:
                {
                    blockedUsers: { userId: deletedUserId, blockedAt }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting and blocking follower: ', error);
                } else {
                    console.log('User was deleted as a follower and blocked, numsAffected: ', numsAffected);
                };
            }
        );
        User.updateOne(
            { _id: deletedUserId },
            {
                $pull:
                {
                    "activities.following": { userId: currentUserId }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting following: ', error);
                } else {
                    console.log('Update was successful. Current user was deleted as a follower from the targeted user profile. NumsAffected: ', numsAffected);
                    // response.json('User was deleted as a follower and blocked.')
                };
            }
        )
    } else if (isAFollower) {
        // delete the target user as a follower from the current user's follower's list and delete the current user from the following list of the target user
        User.bulkWrite(
            [
                {
                    updateOne:
                    {
                        "filter": { _id: currentUserId },
                        "update": {
                            $pull: { followers: { userId: deletedUserId } }
                        }
                    }
                },
                {
                    updateOne:
                    {
                        "filter": { _id: deletedUserId },
                        "update": {
                            $pull: { 'activities.following': { userId: currentUserId } }
                        }
                    }
                }
            ]
        ).then(() => { res.json({ message: 'Updates has occurred. Target user was deleted as a follower.' }); })
    } else {
        User.updateOne(
            { _id: currentUserId },
            {
                $push:
                {
                    blockedUsers: { userId: deletedUserId, blockedAt }
                }
            },
            (error, numsAffected) => {
                if (error) {
                    console.error('Error in deleting and blocking follower: ', error);
                } else {
                    console.log('Target user is blocked, numsAffected: ', numsAffected);
                };
            }
        );
    }
    // res.sendStatus(200);
})

module.exports = router;
