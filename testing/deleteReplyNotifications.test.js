const { delNonexistentReplies, delNonexistentReplyAuthors, delNonexistentCommAuthors, delNonexistentComms, delNonexistentPosts } = require('../functions/delNonexistentValues');
const testData1 = require('./test1/testData1');
const delNotificationsTest1 = require('./test1/delNotificationsTest1.json');
const test1ReplyResults = require('./test1/test1ReplyResults.json');
const test1ReplyAuthorDelResults = require('./test1/testReplyAuthorDelResults.json');
const testCommAuthorDelResults = require('./test1/testCommAuthorDelResults.json');
const testCommDelResults = require('./test1/testCommDelResults.json');
const testResultsDelPosts = require('./test1/testResultsDelPosts.json');




// CASE1: if willDeletePosts, go through all of the postIds in itemsToDel and for eachpostId use it as the search query for the callback function that will be called on the each val in var that contains notifications. if thepostIdin the notifications var is equal to thepostIdin itemsToDel, then delete that post from notifications var

// CASE2: if willDeleteReply, go through all of the postIds in itemsToDel and for each postID, use it as the callback function that will be called for each val in the var that contains the notifications. If thepostIdmatches, access therepliesInfo Loop through therepliesInfo for each val, access thecommentsRepliedTo Loop through thecommentsRepliedTo for each val, access therepliesfield. Loop through therepliesfield. For each reply, access thereplyIds loop through thereplyIds If theidof the reply, matches with the current replyId that is in the loop of itemsToDel, then delete the replyId. If not, then don't do anything.

// STEP1: delete all of the comments, posts,replies authors of replies authors of comments that don't exist
// STEP2: for each object that contains the notification, check if the notification array is empty or doesn't exist. If so, then delete the whole entire object in the notification var 













test.skip('Delete the targeted reply notification from the notifications array', () => {
    const willDelReplies = delNotificationsTest1.find(({ willDelReplies }) => !!willDelReplies);
    const willDelReplyAuthors = delNotificationsTest1.find(({ willDelReplyAuthors }) => !!willDelReplyAuthors);
    const willDelCommentAuthors = delNotificationsTest1.find(({ willDelCommentAuthors }) => !!willDelCommentAuthors);
    const willDelComments = delNotificationsTest1.find(({ willDelComments }) => !!willDelComments);
    const willDelPosts = delNotificationsTest1.find(({ willDelPosts }) => !!willDelPosts);
    let replyIds;
    let _notifications;

    if (willDelReplies) {
        replyIds = willDelReplies.itemsToDel;
        _notifications = delNonexistentReplies(testData1, replyIds);
        expect(_notifications).toStrictEqual(test1ReplyResults);
    };
    if (willDelReplyAuthors) {
        replyAuthorIds = willDelReplyAuthors.itemsToDel;
        _notifications = _notifications ? delNonexistentReplyAuthors(_notifications, replyAuthorIds) : delNonexistentReplyAuthor(testData1, replyIds)
        expect(_notifications).toStrictEqual(test1ReplyAuthorDelResults);
    };
    if (willDelCommentAuthors) {
        commentAuthorIds = willDelCommentAuthors.itemsToDel;
        _notifications = delNonexistentCommAuthors(_notifications, commentAuthorIds)
        expect(_notifications).toStrictEqual(testCommAuthorDelResults);
    };
    if (willDelComments) {
        commentIds = willDelComments.itemsToDel;
        _notifications = delNonexistentComms(_notifications, commentIds)
        expect(_notifications).toStrictEqual(testCommDelResults);
    };
    if (willDelPosts) {
        postIds = willDelPosts.itemsToDel;
        _notifications = delNonexistentPosts(_notifications, postIds)
        expect(_notifications).toStrictEqual(testResultsDelPosts);
    }






})
