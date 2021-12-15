


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
    userId: id1
};

// CASE2
const test2 = {
    notificationsToDel: [{ willDelUserPostLikes: true, itemsForDel: [id2, id3] }],
    userId: id2
}

// CASE3
const test3 = {
    notificationsToDel: [{ willDelComments: true, itemsForDel: [id1, id2] }],
    userId: id3
}

// CASE 1 
const test4 = {
    notificationsToDel: [{ willDelComments: true, itemsForDel: [id1, id2] }, { willDelUserPostLikes: true, itemsForDel: [id3, id4] }],
    userId: id5
}


test("Add the reply like notifications that will be deleted because the user doesn't exist.", () => {
    expect(addNotificationToDel(test1.notificationsToDel, test1.userId, 'willDelUserPostLikes')).toStrictEqual([{ willDelUserPostLikes: true, itemsForDel: [id1] }]);
    expect(addNotificationToDel(test2.notificationsToDel, test2.userId, 'willDelUserPostLikes')).toStrictEqual([{ willDelUserPostLikes: true, itemsForDel: [id2, id3] }]);
    expect(addNotificationToDel(test3.notificationsToDel, test3.userId, 'willDelUserPostLikes')).toStrictEqual([{ willDelComments: true, itemsForDel: [id1, id2] }, { willDelUserPostLikes: true, itemsForDel: [id3] }]);
    expect(addNotificationToDel(test4.notificationsToDel, test4.userId, 'willDelUserPostLikes')).toStrictEqual([{ willDelComments: true, itemsForDel: [id1, id2] }, { willDelUserPostLikes: true, itemsForDel: [id3, id4, id5] }]);
});