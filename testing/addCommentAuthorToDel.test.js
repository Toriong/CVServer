const addNotificationToDel = require('../functions/addNotificationsToDel')

const {
    v4: uuidv4,
} = require('uuid');

const id1 = uuidv4()
const id2 = uuidv4()
const id3 = uuidv4()
const id4 = uuidv4()
const id5 = uuidv4()
const id6 = uuidv4()


// CASE4
const test1 = {
    notificationsToDel: undefined,
    itemIdToDel: id1
};

// CASE2
const test2 = {
    notificationsToDel: [{ willDelCommentAuthors: true, itemsForDel: [id2, id3] }],
    itemIdToDel: id2
}

// CASE3
const test3 = {
    notificationsToDel: [{ willDelReplies: true, itemsForDel: [id1, id2] }],
    itemIdToDel: id3
}

// CASE 1 
const test4 = {
    notificationsToDel: [{ willDelReplies: true, itemsForDel: [id1, id2] }, { willDelCommentAuthors: true, itemsForDel: [id3, id4, id5] }],
    itemIdToDel: id6
}

// IF THE ARRAY THAT HOLDS THE NOTIFICATIONS DOESN'T EXIST OR IS EMPTY, THEN DELETE THE WHOLE ENTIRE OBJECT THAT CONTAINS THE POST ID AND THE REPLY IDS 
test.skip("Add the notifications that will be deleted because the comment author doesn't exist.", () => {
    expect(addNotificationToDel(test1.notificationsToDel, test1.itemIdToDel, 'willDelCommentAuthors')).toStrictEqual([{ willDelCommentAuthors: true, itemsForDel: [id1] }]);
    expect(addNotificationToDel(test2.notificationsToDel, test2.itemIdToDel, 'willDelCommentAuthors')).toStrictEqual([{ willDelCommentAuthors: true, itemsForDel: [id2, id3] }]);
    expect(addNotificationToDel(test3.notificationsToDel, test3.itemIdToDel, 'willDelCommentAuthors')).toStrictEqual([{ willDelReplies: true, itemsForDel: [id1, id2] }, { willDelCommentAuthors: true, itemsForDel: [id3] }]);
    expect(addNotificationToDel(test4.notificationsToDel, test4.itemIdToDel, 'willDelCommentAuthors')).toStrictEqual([{ willDelReplies: true, itemsForDel: [id1, id2] }, { willDelCommentAuthors: true, itemsForDel: [id3, id4, id5, id6] }]);
})