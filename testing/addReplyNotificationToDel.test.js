const addNotificationToDel = require('../functions/addNotificationsToDel')

const {
    v4: uuidv4,
} = require('uuid');

const id1 = uuidv4()
const id2 = uuidv4()
const id3 = uuidv4()
const id4 = uuidv4()
const id5 = uuidv4()


// CASE4
const test1 = {
    notificationsToDel: undefined,
    replyId: id1
};

// CASE2
const test2 = {
    notificationsToDel: [{ willDelReplies: true, itemsForDel: [id2, id3] }],
    replyId: id2
}

// CASE3
const test3 = {
    notificationsToDel: [{ willDelComments: true, itemsForDel: [id1, id2] }],
    replyId: id3
}

// CASE 1 
const test4 = {
    notificationsToDel: [{ willDelComments: true, itemsForDel: [id1, id2] }, { willDelReplies: true, itemsForDel: [id3, id4] }],
    replyId: id5
}


test.skip('Add the reply notifications that will be deleted.', () => {
    expect(addNotificationToDel(test1.notificationsToDel, test1.replyId, 'willDelReplies')).toStrictEqual([{ willDelReplies: true, itemsForDel: [id1] }]);
    expect(addNotificationToDel(test2.notificationsToDel, test2.replyId, 'willDelReplies')).toStrictEqual([{ willDelReplies: true, itemsForDel: [id2, id3] }]);
    expect(addNotificationToDel(test3.notificationsToDel, test3.replyId, 'willDelReplies')).toStrictEqual([{ willDelComments: true, itemsForDel: [id1, id2] }, { willDelReplies: true, itemsForDel: [id3] }]);
    expect(addNotificationToDel(test4.notificationsToDel, test4.replyId, 'willDelReplies')).toStrictEqual([{ willDelComments: true, itemsForDel: [id1, id2] }, { willDelReplies: true, itemsForDel: [id3, id4, id5] }]);
});