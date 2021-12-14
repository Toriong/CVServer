const delNonexistentValues = require('../functions/delNonexistentValues');
const notificationsTest1 = require('./test1/testData1');
const test1Result = require('./test1/test1Result.json');
const delNotificationsTest1 = require('./test1/delNotificationsTest1.json');



// CASE1: if willDeletePosts, go through all of the postIds in itemsToDel and for each postId, use it as the search query for the callback function that will be called on the each val in var that contains notifications. if the postId in the notifications var is equal to the postId in itemsToDel, then delete that post from notifications var

// CASE2: if willDeleteReply, go through all of the postIds in itemsToDel and for each postID, use it as the callback function that will be called for each val in the var that contains the notifications. If the postId matches, access the repliesInfo. Loop through the repliesInfo, for each val, access the commentsRepliedTo. Loop through the commentsRepliedTo, for each val, access the replies field. Loop through the replies field. For each reply, access the replyIds, loop through the replyIds. If the id of the reply, matches with the current replyId that is in the loop of itemsToDel, then delete the replyId. If not, then don't do anything.

// STEP1: delete all of the comments, posts, replies, authors of replies, authors of comments that don't exist
// STEP2: for each object that contains the notification, check if the notification array is empty or doesn't exist. If so, then delete the whole entire object in the notification var 












test('Delete the targeted reply notification from the notifications array', () => {
    expect(delNonexistentValues(notificationsTest1, delNotificationsTest1)).toStrictEqual(test1Result);
})
