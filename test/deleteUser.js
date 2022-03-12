
const BlogPost = require("../models/blogPost")
const mongoose = require('mongoose');
const User = require("../models/user");
const { getUser } = require("../functions/getUser")
const { getRandomArrayIndex } = require('../functions/getRandomArrayIndex')
// const assert = require("assert");
const { expect, assert } = require("chai");
const dbconnection = "mongodb+srv://gtorio:simba1997@clustercv.blvqa.mongodb.net/CVBlog"
const userAId = 'a3bb23d5-84ad-40e9-84c9-1065fac0d255';
const userBId = '9f381a8d-4ced-4598-9425-c6754047433c';
const userCId = 'aae2b14a-0d2f-4755-9874-d99a9387ec16';
const userDId = '7608fb16-6806-409a-bd28-3ab364c029fb';
const userToDeleteId = 'd912e3db-d8ff-4a7f-aba7-6433170ca10c';
const postsToDelete = ['228f1140-f2e6-42a3-a152-dde27ac17445', '32f6243e-c851-40b3-998e-6af80e070e78', '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76', '3de32081-0850-42d4-863a-de86c3d4bc31', '2c7ea4fb-960a-47b9-bfa5-2d756cfbc4b0']
const usersToDelete = ['d912e3db-d8ff-4a7f-aba7-6433170ca10c', 'a3bb23d5-84ad-40e9-84c9-1065fac0d255', '9f381a8d-4ced-4598-9425-c6754047433c', 'aae2b14a-0d2f-4755-9874-d99a9387ec16', '7608fb16-6806-409a-bd28-3ab364c029fb']
const hasFollowers = true;
const isFollowingUsers = true;
let hasGroupChats = true;
const userToDeleteFollowers = hasFollowers ? [{ userId: userBId }, { userId: userDId }, { userId: userCId }] : [];
const userToDeleteFollowing = isFollowingUsers ? [{ userId: userBId }, { userId: userDId }, { userId: userAId }] : [];
const conversationAId = '58cda773-4eac-4284-8d08-b30f028e0b5d';
const conversationBId = 'b4dfcb17-66ff-44d8-ac71-48d620912592';
const conversationCId = 'a567f531-68e1-42ea-8564-ad72b8dd1ecb';
const conversationDId = '22a3e981-3729-48ca-b7b9-ee9cd3bbaeaf';
const conversationEId = 'df62e709-5338-4260-959d-adb01c1e428d';


const conversations = [
    {
        conversationId: conversationAId,
        conversationUsers: [userAId, userBId, userCId, userToDeleteId],
        adMins: [{ userId: userToDeleteId, isMain: true }]
    },
    {
        conversationId: conversationBId,
        conversationUsers: [userAId, userBId, userCId, userToDeleteId, userDId],
        adMins: [{ userId: userToDeleteId, isMain: true }, { userId: userBId, isMain: false }, { userId: userCId, isMain: false }]
    },
    {
        // GOAL: the following should occur:
        // the main admin should be userA
        // the deletedUser shouldn't be in conversationUsers array
        // the deletedUser shouldn't be in adMins array 
        conversationId: conversationCId,
        conversationUsers: [userAId, userBId, userDId, userToDeleteId],
        adMins: [{ userId: userAId, isMain: true }, { userId: userToDeleteId, isMain: false }]
    },
    {
        // GOAL:
        // the deletedUser shouldn't be in the conversationUsers array
        conversationId: conversationDId,
        conversationUsers: [userAId, userCId, userToDeleteId],
        adMins: [{ userId: userAId, isMain: true }]
    }
]

let newConversationsForUserA;
const conversationsForUserA = [
    {
        conversationId: conversationAId,
        conversationUsers: [userAId, userBId, userCId, userToDeleteId],
        adMins: [{ userId: userToDeleteId, isMain: true }]
    },
    {
        conversationId: conversationBId,
        conversationUsers: [userAId, userBId, userCId, userToDeleteId, userDId],
        adMins: [{ userId: userToDeleteId, isMain: true }, { userId: userBId, isMain: false }, { userId: userCId, isMain: false }]
    },
    {
        conversationId: conversationCId,
        conversationUsers: [userAId, userBId, userDId, userToDeleteId],
        adMins: [{ userId: userAId, isMain: true }, { userId: userToDeleteId, isMain: false }]
    },
    {
        conversationId: conversationDId,
        conversationUsers: [userAId, userCId, userToDeleteId],
        adMins: [{ userId: userAId, isMain: true }]
    }
];

let newConversationsForUserB;
const conversationsForUserB = [
    {
        conversationId: conversationAId,
        conversationUsers: [userAId, userBId, userCId, userToDeleteId],
        adMins: [{ userId: userToDeleteId, isMain: true }]
    },
    {
        conversationId: conversationBId,
        conversationUsers: [userAId, userBId, userCId, userToDeleteId, userDId],
        adMins: [{ userId: userToDeleteId, isMain: true }, { userId: userBId, isMain: false }, { userId: userCId, isMain: false }]
    },
    {
        conversationId: conversationCId,
        conversationUsers: [userAId, userBId, userDId, userToDeleteId],
        adMins: [{ userId: userAId, isMain: true }, { userId: userToDeleteId, isMain: false }]
    }
]


let newConversationsForUserC;
const conversationsForUserC = [
    {
        conversationId: conversationAId,
        conversationUsers: [userAId, userBId, userCId, userToDeleteId],
        adMins: [{ userId: userToDeleteId, isMain: true }]
    },
    {
        conversationId: conversationBId,
        conversationUsers: [userAId, userBId, userCId, userToDeleteId, userDId],
        adMins: [{ userId: userToDeleteId, isMain: true }, { userId: userBId, isMain: false }, { userId: userCId, isMain: false }]
    },
    {
        conversationId: conversationDId,
        conversationUsers: [userAId, userCId, userToDeleteId],
        adMins: [{ userId: userAId, isMain: true }]
    }
]

let newConversationsForUserD;
const conversationsForUserD = [
    {
        conversationId: conversationBId,
        conversationUsers: [userAId, userBId, userCId, userToDeleteId, userDId],
        adMins: [{ userId: userToDeleteId, isMain: true }, { userId: userBId, isMain: false }, { userId: userCId, isMain: false }]
    },
    {
        conversationId: conversationCId,
        conversationUsers: [userAId, userBId, userDId, userToDeleteId],
        adMins: [{ userId: userAId, isMain: true }, { userId: userToDeleteId, isMain: false }]
    }
]


before(done => {
    mongoose.connect(dbconnection, {
        useUnifiedTopology: true,
        useNewUrlParser: true
    }).then(() => {
        console.log("connection to mongodb database is successful!")
        done();
    }).catch(error => {
        console.log(`Error in connecting to DB: ${error}`)
    });
})

// GOAL: if the user is part of a group, then delete the user from the conversationUsers group and from the admin field 


// GOAL: for all users in a group that the deleted user is a part designate an admin for the group 


// CASE #1: the admin is chosen at random amongst the users in the array that is stored in the admins field 
// the new admin is chosen and pushed into the adMins field as the following data structure: {userId: id of user, isMain: true}
// the admin is chosen at random amongst the admins in the array that is stored in the admins field
// filter out the deleted user from admins field 
// there are other admins besides the current user admin in the admins field 
// check if there are any other admins besides the deleted user in the adMins field 

// CASE #2: the admin is chosen at random amongst the users in the array that is stored in the conversationUsers
// for all users, the new admin is chosen and updated in their messages field 
// the new admin is pushed into the adMins field as the following data structure {userId: id of user, isMain: true}
// access the admins field array
// at random, choose a new admin 
// filter out the deleted the deleted user in the conversationUsers
// access the conversationUsers field 
// there are no other admins in the adMins array field 
// check if there any other admins in the adMins array field
// if group convo 
// for each chat, check if the chat is a group convo
// go through all of the conversations

describe('Delete all material from the deletedUser', () => {
    let userToDelete;
    let blogPost1;//delete comment // delete reply 
    let blogPost2;//delete post
    let blogPost3;// delete reply like
    let blogPost4; //delete comment like // delete the post like 
    let blogPost5; // delete post
    let userA; // userA is following userToDelete, delete the userToDelete as a following on userA's account
    let userB; ///userB is following userToDelete, delete the userToDelete as a following on userB's account
    let userC; ///userC is a follower of userToDelete, delete userToDelete from userC's following array
    let userD; // userD is a follower of userToDelete, delete userToDelete from userD's following array

    before(done => {
        const _conversations = hasGroupChats ?
            conversations
            :
            {
                conversationId: conversationEId,
                recipientId: userCId
            }
        userToDelete = new User({ id: userToDeleteId, activities: { following: userToDeleteFollowing }, followers: userToDeleteFollowers, conversations: _conversations })
        userToDelete.save()
            .then(() => { done() });
    });

    before(done => {
        userA = new User(
            {
                id: userAId,
                followers:
                    [
                        {
                            userId: userToDeleteId
                        },
                    ],
                conversations: conversationsForUserA
            }
        )
        userA.save()
            .then(() => { done() });
    })

    before(done => {
        userB = new User(
            {
                id: userBId,
                followers:
                    [
                        {
                            userId: userToDeleteId
                        },
                        {
                            userId: 'df5b8625-2aae-4a35-b7ac-78de239dab46'
                        }
                    ],
                activities:
                {
                    following:
                        [
                            {
                                userId: userToDeleteId
                            },
                            {
                                userId: 'df5b8625-2aae-4a35-b7ac-78de239dab46'
                            }
                        ]
                },
                conversations: conversationsForUserB
            })
        userB.save()
            .then(() => { done() });
    })
    before(done => {
        userC = new User(
            {
                id: userCId,
                activities:
                {
                    following:
                        [
                            {
                                userId: userToDeleteId
                            }
                        ]
                },
                conversations: conversationsForUserC
            }

        )
        userC.save()
            .then(() => { done() });
    })
    before(done => {
        userD = new User(
            {
                id: userDId,
                followers:
                    [
                        {
                            userId: userToDeleteId
                        },
                        {
                            userId: 'bfc449bc-5f4b-4bcf-a9bb-90bcbd174f00'
                        }
                    ],
                activities:
                {
                    following:
                        [
                            {
                                userId: userToDeleteId
                            },
                            {
                                userId: 'ab2c19d9-3561-43d2-a4f6-e529b7ac9dfe'
                            }
                        ]
                },
                conversations: conversationsForUserD
            }
        )
        userD.save()
            .then(() => { done() });
    })

    before(done => {
        blogPost1 = new BlogPost({
            _id: '228f1140-f2e6-42a3-a152-dde27ac17445',
            comments:
                [
                    // the first comment will be deleted 
                    {
                        commentId: 'b6f9534e-fdbc-44b9-be4a-f7bc3d545dbf',
                        userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c',
                        replies: []
                    },
                    {
                        commentId: '8603af61-93d7-4a0d-8a1a-9428959dc6f4',
                        userId: 'fba7cdea-b782-41f5-9fb3-e1964ac7a3c1',
                        replies:
                            // delete the replies
                            [
                                {
                                    replyId: '68a56a09-ec6f-45c9-a162-a01d02d8f7d7',
                                    userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
                                },
                                {
                                    replyId: '86c7258b-ce3b-4e10-81b9-b1d2bf0dae69',
                                    userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
                                }
                            ]
                    }
                ]
        })
        blogPost1.save()
            .then(() => { done() })
    })

    before(done => {
        // the whole post will be deleted 
        blogPost2 = new BlogPost(
            {
                _id: '32f6243e-c851-40b3-998e-6af80e070e78',
                authorId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c',
                comments: []
            }
        )
        blogPost2.save()
            .then(() => { done() })
    })

    before(done => {
        // delete all of the reply likes 
        blogPost3 = new BlogPost({
            _id: '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76',
            comments:
                [
                    {
                        commentId: '6efc5d02-af8a-46cd-a837-438986cf4098',
                        userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28',
                        replies: []
                    },
                    {
                        commentId: '2c305eed-c5ea-4a23-9ad3-03d501a2aec6',
                        replies:
                            [
                                {
                                    replyId: 'dc078f7f-faaa-4acf-a2c0-2b669cbe4ec4',
                                    userId: 'abebb8b2-093f-494b-bc61-f5b44995abb7',

                                    userIdsOfLikes:
                                        [
                                            // delete this like
                                            {
                                                userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
                                            },
                                            {
                                                userId: '6112d39e-2f04-4312-b5fa-72138adce6aa'
                                            }
                                        ]
                                },
                                {
                                    replyId: '6bad8fb7-e8f5-40d2-a367-edfbb1e320a1',
                                    userId: 'f6bce787-aaf2-4460-97be-4466fa0dc571'
                                }
                            ],
                        userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28'
                    },
                    {
                        commentId: '2a22bcab-7043-4d2b-bd84-9565bba6099d',
                        userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28',
                        replies: []
                    }
                ]
        })
        blogPost3.save()
            .then(() => { done() })
    });

    before(done => {
        blogPost4 = new BlogPost({
            _id: '3de32081-0850-42d4-863a-de86c3d4bc31',
            // delete this like
            userIdsOfLikes: [{ userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c' }],
            comments:
                [
                    {
                        commentId: '17e467e2-afaf-44a4-b86a-dac1dfd2e4d6',
                        userId: '97c1ba42-4483-475b-9de2-0db6b936fcc9',
                        userIdsOfLikes:
                            // delete this like
                            [
                                {
                                    userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
                                },
                                {
                                    userId: '6112d39e-2f04-4312-b5fa-72138adce6aa'
                                }
                            ]
                    },
                    {
                        commentId: '1bad6510-89d3-464a-af0d-2eed1b2c44f6',
                        replies:
                            [
                                {
                                    replyId: '5bc41431-4c47-46d5-9b8f-3c41eaf2220e',
                                    userId: '8c3c10ce-5432-43b5-bbf3-966859143fc9',
                                },
                                {
                                    replyId: '38fb0e9d-d2a0-42ab-b1df-cb6a14a2a3bf',
                                    userId: '38fb0e9d-d2a0-42ab-b1df-cb6a14a2a3bf'
                                }
                            ],
                        userId: 'abb167b8-f3b8-4eab-91be-3b6a17cc4ccd'
                    },
                    {
                        commentId: '2a22bcab-7043-4d2b-bd84-9565bba6099d',
                        userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28',
                        replies: []
                    }
                ]
        });
        blogPost4.save()
            .then(() => { done() })
    })

    before(done => {
        // delete this post
        blogPost5 = new BlogPost(
            {
                _id: '2c7ea4fb-960a-47b9-bfa5-2d756cfbc4b0',
                authorId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c',
                comments: []
            }
        );
        blogPost5.save()
            .then(() => { done() })
    });

    // for group messages, delete the deleted user from the arrays that is stored in admins and conversationUser fields
    // for all group chats, the deleted user will not be present in all of them pertaining to the following fields:
    // conversationUsers
    // adMins
    before(done => {
        User.findOne({ id: userToDeleteId }, { conversations: 1 }).then(({ conversations }) => {
            if (conversations) {
                let conversationBulkWrites;
                conversations.forEach(conversation => {
                    const { conversationUsers, adMins, conversationId } = conversation;
                    let _conversationUsers;
                    const isDeletedUserMainAdmin = adMins && adMins.find(({ userId }) => userId === userToDeleteId)?.isMain;
                    if (isDeletedUserMainAdmin && (adMins?.length > 1)) {
                        let _adMins = adMins.filter(({ userId }) => userId !== userToDeleteId);
                        const newMainAdmin = _adMins[getRandomArrayIndex(_adMins.length)];
                        _adMins = _adMins.map(user => {
                            if (user.userId === newMainAdmin.userId) {
                                return {
                                    ...user,
                                    isMain: true
                                }
                            };

                            return user;
                        })
                        _conversationUsers = conversationUsers.filter(userId => userId !== userToDeleteId);
                        console.log('_conversationUsers: ', _conversationUsers)
                        const newConversation = {
                            conversationId: conversationId,
                            adMins: _adMins,
                            conversationUsers: _conversationUsers
                        }
                        const updateManyObj = {
                            updateMany: {
                                'filter': { id: { $in: _conversationUsers } },
                                'update': {
                                    $set: {
                                        'conversations.$[conversation]': newConversation
                                    }
                                },
                                'arrayFilters': [{ 'conversation.conversationId': conversationId }]
                            }
                        }

                        conversationBulkWrites = conversationBulkWrites ? [...conversationBulkWrites, updateManyObj] : [updateManyObj];
                    } else if (isDeletedUserMainAdmin && (conversationUsers.length > 1)) {
                        // CASE: the deleted user is the main admin of the group and is the only admin

                        // GOAL: choose an admin in the conversationUsers array 
                        _conversationUsers = conversationUsers.filter(userId => userId !== userToDeleteId);
                        const newMainAdminId = _conversationUsers[getRandomArrayIndex(_conversationUsers.length)]
                        const _adMins = [{ userId: newMainAdminId, isMain: true }]
                        const newConversation = {
                            conversationId: conversationId,
                            adMins: _adMins,
                            conversationUsers: _conversationUsers
                        }
                        const updateManyObj = {
                            updateMany: {
                                'filter': { id: { $in: _conversationUsers } },
                                'update': {
                                    $set: {
                                        'conversations.$[conversation]': newConversation
                                    }
                                },
                                'arrayFilters': [{ 'conversation.conversationId': conversationId }]
                            }
                        }

                        conversationBulkWrites = conversationBulkWrites ? [...conversationBulkWrites, updateManyObj] : [updateManyObj];
                    } else if (conversationUsers.length > 1) {
                        _conversationUsers = conversationUsers.filter(userId => userId !== userToDeleteId)
                        const _adMins = adMins.filter(({ userId }) => userId !== userToDeleteId);
                        const newConversation = {
                            conversationId: conversationId,
                            adMins: _adMins,
                            conversationUsers: _conversationUsers
                        }
                        const updateManyObj = {
                            updateMany: {
                                'filter': { id: { $in: _conversationUsers } },
                                'update': {
                                    $set: {
                                        'conversations.$[conversation]': newConversation
                                    }
                                },
                                'arrayFilters': [{ 'conversation.conversationId': conversationId }]
                            }
                        }

                        conversationBulkWrites = conversationBulkWrites ? [...conversationBulkWrites, updateManyObj] : [updateManyObj];
                    }
                });
                if (conversationBulkWrites) {
                    User.bulkWrite(conversationBulkWrites).then(() => {
                        console.log('Conversations for users has been updated.')
                        done()
                    }).catch(error => {
                        if (error) {
                            console.error('An error has occurred in updating conversations of users: ', error)
                        }
                    })
                } else {
                    hasGroupChats = false;
                    done();
                };
            } else {
                console.log('No conversations for deleted user.')
                done();
            }
        }).catch(error => {
            if (error) {
                console.error('An error has occurred: ', error)
            }
        })
    });

    // before(done => {
    //     User.find({ id: [userAId, userBId, userCId, userDId] }, { conversations: 1 }).then(users => {
    //         newConversationsForUserA = users.find(({ id }) => JSON.stringify(id) === JSON.stringify(userAId));
    //         newConversationsForUserB = users.find(({ id }) => JSON.stringify(id) === JSON.stringify(userBId));
    //         newConversationsForUserC = users.find(({ id }) => JSON.stringify(id) === JSON.stringify(userCId));
    //         newConversationsForUserD = users.find(({ id }) => JSON.stringify(id) === JSON.stringify(userDId));
    //         console.log('Conversations has been saved.')
    //         done();
    //     }).catch(error => {
    //         if (error) {
    //             console.error('An error has occurred: ', error)
    //             done();
    //         }
    //     })
    // })


    before(done => {
        BlogPost.bulkWrite(
            [
                {
                    // delete the posts
                    deleteMany: {
                        'filter': { authorId: userToDeleteId }
                    }
                },
                {
                    // delete reply likes
                    updateMany: {
                        'filter': { "comments.0.replies": { $exists: true } },
                        'update':
                        {
                            $pull: {
                                'comments.$[comment].replies.$[reply].userIdsOfLikes': { userId: userToDeleteId }
                            }
                        },
                        'arrayFilters': [{ 'comment.commentId': { $exists: true } }, { 'reply.replyId': { $exists: true } }]
                    }
                },
                {
                    // delete the comment likes
                    updateMany: {
                        'filter': { "comments.0": { $exists: true } },
                        'update':
                        {
                            $pull: {
                                'comments.$[comment].userIdsOfLikes': { userId: userToDeleteId }
                            }
                        },
                        'arrayFilters': [{ 'comment.commentId': { $exists: true } }]
                    }
                },
                {
                    // delete the replies
                    updateMany: {
                        'filter': { "comments.0.replies": { $exists: true } },
                        'update':
                        {
                            $pull: {
                                'comments.$[comment].replies': { userId: userToDeleteId }
                            }
                        },
                        'arrayFilters': [{ 'comment.commentId': { $exists: true } }]
                    }
                },
                {
                    // delete the comments 
                    updateMany: {
                        'filter': { "comments.0": { $exists: true } },
                        'update':
                        {
                            $pull: {
                                'comments': { userId: userToDeleteId }
                            }
                        }
                    }
                },
                {
                    // delete the post like made by the user that was deleted
                    updateMany: {
                        'filter': { "userIdsOfLikes.0": { $exists: true } },
                        'update':
                        {
                            $pull: {
                                userIdsOfLikes: { userId: userToDeleteId }
                            }
                        }
                    }
                }
            ]
        )
            .then(() => {
                done();
            })
            .catch(error => {
                if (error) {
                    console.error('An error has occurred in deleting all material on feed that is by the deleted user: ', error);
                };
            })
    })

    before(done => {
        User.findOne({ id: userToDeleteId }, { followers: 1, "activities.following": 1 }).then(user => {
            const { followers, activities } = user;
            const deleteUserObj = { deleteOne: { 'filter': { id: userToDeleteId } } };
            let bulkWriteUpdates;

            if (followers?.length) {
                const userToDeleteFollowers = followers.map(({ userId }) => userId);
                const pullUserFromFollowingObj = {
                    updateMany: {
                        'filter': { id: { $in: userToDeleteFollowers } },
                        'update':
                        {
                            $pull: {
                                'activities.following': { userId: userToDeleteId }
                            }
                        }
                    }
                };
                bulkWriteUpdates = [pullUserFromFollowingObj]
            }

            if (activities?.following?.length) {
                // if userA is being followed by the deleted user, then delete the deleted user from the array that is stored in followers 
                const userToDeleteFollowing = activities.following.map(({ userId }) => userId)
                const pullUserFromFollowersObj = {
                    updateMany: {
                        'filter': { id: { $in: userToDeleteFollowing } },
                        'update':
                        {
                            $pull: {
                                'followers': { userId: userToDeleteId }
                            }
                        }
                    }
                }
                bulkWriteUpdates = bulkWriteUpdates ? [...bulkWriteUpdates, pullUserFromFollowersObj] : [pullUserFromFollowersObj]
            };


            bulkWriteUpdates = bulkWriteUpdates ? [...bulkWriteUpdates, deleteUserObj] : [deleteUserObj]

            User.bulkWrite(bulkWriteUpdates)
                .then(() => { done() })
                .catch(error => {
                    if (error) {
                        console.error('An error has occurred in inserting dummy data into the collection of user into the DB: ', error);
                    }
                })
        }).catch(error => {
            if (error) {
                console.error('An error has occurred in getting target user to delete: ', error)
            };
            done();
        })
    });


    // GOAL: create a test that will check if the group chat has an main admin 

    // conversationA:
    // WHAT I WANT: the main admin of the group will be either userAId, userBId, userCId
    if (hasGroupChats) {
        // testing for conversationA
        it('deleted user was deleted from chatA in all chats of users in chatA', done => {
            User.find({ id: { $in: [userAId, userBId, userCId] } }, { conversations: 1, id: 1 }).then(users => {
                console.log('users: ', users)
                const userA = users.find(({ id }) => id === userAId)
                const userB = users.find(({ id }) => id === userBId)
                const userC = users.find(({ id }) => id === userCId);
                console.log('userA: ', userA)
                const chatAUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationAId);
                const allChatUsersForAllUserChats = [...chatAUserA.conversationUsers, ...chatAUserB.conversationUsers, ...chatAUserC.conversationUsers]
                const areStrings = allChatUsersForAllUserChats.every(userId => typeof userId === 'string');
                const areNotUndefined = allChatUsersForAllUserChats.every(userId => userId !== undefined);
                if (areNotUndefined && areStrings) {
                    const isDeletedUserNotPresentChatAUserA = !chatAUserA.conversationUsers.find(userId => userId === userToDeleteId)
                    const isDeletedUserNotPresentChatAUserB = !chatAUserB.conversationUsers.find(userId => userId === userToDeleteId)
                    const isDeletedUserNotPresentChatAUserC = !chatAUserC.conversationUsers.find(userId => userId === userToDeleteId)
                    const booleanValsIsDeletedUserNotPresent = [isDeletedUserNotPresentChatAUserA, isDeletedUserNotPresentChatAUserB, isDeletedUserNotPresentChatAUserC]
                    assert.equal(booleanValsIsDeletedUserNotPresent.every(val => val === true), true)
                } else {
                    assert.fail()
                }
                done()
            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })

        it('deleted user was deleted from chatA in all chats of users in chatA as a admin.', done => {
            User.find({ id: { $in: [userAId, userBId, userCId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId)
                const userB = users.find(({ id }) => id === userBId)
                const userC = users.find(({ id }) => id === userCId);
                const chatAUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const isDeletedUserNotPresentChatAUserA = !chatAUserA.adMins.find(({ userId }) => userId === userToDeleteId)
                const isDeletedUserNotPresentChatAUserB = !chatAUserB.adMins.find(({ userId }) => userId === userToDeleteId)
                const isDeletedUserNotPresentChatAUserC = !chatAUserC.adMins.find(({ userId }) => userId === userToDeleteId)
                const booleanValsIsDeletedUserNotPresent = [isDeletedUserNotPresentChatAUserA, isDeletedUserNotPresentChatAUserB, isDeletedUserNotPresentChatAUserC]
                assert.equal(booleanValsIsDeletedUserNotPresent.every(val => val === true), true)
                done()
            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })

        it('Testing if the same main admin for all users in the chat.', done => {
            User.find({ id: { $in: [userAId, userBId, userCId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId)
                const userB = users.find(({ id }) => id === userBId)
                const userC = users.find(({ id }) => id === userCId);
                const chatAUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserAMainAdminId = chatAUserA.adMins.find(({ isMain }) => isMain).userId
                const chatAUserBMainAdminId = chatAUserB.adMins.find(({ isMain }) => isMain).userId
                const chatAUserCMainAdminId = chatAUserC.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdForAllChats = [chatAUserCMainAdminId, chatAUserBMainAdminId, chatAUserAMainAdminId];
                const areStrings = mainAdminIdForAllChats.every(userId => typeof userId === 'string')
                const areNotUndefined = mainAdminIdForAllChats.every(userId => userId !== undefined);
                if (areStrings && areNotUndefined) {
                    assert.equal(mainAdminIdForAllChats.every(userId => userId === chatAUserAMainAdminId), true)
                    done()
                } else {
                    assert.fail()
                }
            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })

        it('Is main admin either userA, b, or c for chatA.', done => {
            User.find({ id: { $in: [userAId, userBId, userCId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId)
                const userB = users.find(({ id }) => id === userBId)
                const userC = users.find(({ id }) => id === userCId);
                const chatAUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationAId)
                const chatAUserAMainAdminId = chatAUserA.adMins.find(({ isMain }) => isMain).userId
                const chatAUserBMainAdminId = chatAUserB.adMins.find(({ isMain }) => isMain).userId
                const chatAUserCMainAdminId = chatAUserC.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdForAllChats = [chatAUserAMainAdminId, chatAUserBMainAdminId, chatAUserCMainAdminId]
                const isMainAdminSameForAllChats = mainAdminIdForAllChats.every(userId => userId === chatAUserAMainAdminId);
                const areStrings = mainAdminIdForAllChats.every(userId => typeof userId === 'string')
                const areNotUndefined = mainAdminIdForAllChats.every(userId => userId !== undefined);
                if (isMainAdminSameForAllChats && areNotUndefined && areStrings) {
                    assert.equal(mainAdminIdForAllChats.every(userId => [userAId, userBId, userCId].includes(userId)), true)
                } else {
                    assert.fail()
                }
                done()
            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })
        // end of testing for conversationA

        // start of testing of conversationB
        it('deleted user was deleted from chatB in all chats of users in chatB', done => {
            User.find({ id: { $in: [userAId, userBId, userCId, userDId] } }, { conversations: 1, id: 1 }).then(users => {
                console.log('users: ', users)
                const userA = users.find(({ id }) => id === userAId);
                const userB = users.find(({ id }) => id === userBId);
                const userC = users.find(({ id }) => id === userCId);
                const userD = users.find(({ id }) => id === userDId);
                const chatBUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserD = userD.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const usersInAllChats = [...chatBUserA.conversationUsers, ...chatBUserB.conversationUsers, ...chatBUserC.conversationUsers, ...chatBUserD.conversationUsers];
                const areStrings = usersInAllChats.every(userId => typeof userId === 'string');
                const areNotUndefined = usersInAllChats.every(userId => userId !== undefined);
                if (areNotUndefined && areStrings) {
                    const isDeletedUserNotPresentChatBUserA = !chatBUserA.conversationUsers.find(userId => userId === userToDeleteId)
                    const isDeletedUserNotPresentChatBUserB = !chatBUserB.conversationUsers.find(userId => userId === userToDeleteId)
                    const isDeletedUserNotPresentChatBUserC = !chatBUserC.conversationUsers.find(userId => userId === userToDeleteId)
                    const isDeletedUserNotPresentChatBUserD = !chatBUserD.conversationUsers.find(userId => userId === userToDeleteId)
                    const booleanValsIsDeletedUserNotPresent = [isDeletedUserNotPresentChatBUserA, isDeletedUserNotPresentChatBUserB, isDeletedUserNotPresentChatBUserC, isDeletedUserNotPresentChatBUserD]
                    assert.equal(booleanValsIsDeletedUserNotPresent.every(val => val === true), true)
                    done()
                } else {
                    assert.fail()
                }

            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        });

        it("Deleted user is not present as an admin in all users' chats of chatB.", done => {
            User.find({ id: { $in: [userAId, userBId, userCId, userDId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId)
                const userB = users.find(({ id }) => id === userBId)
                const userC = users.find(({ id }) => id === userCId);
                const userD = users.find(({ id }) => id === userDId);
                const chatBUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserD = userD.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const isDeletedUserNotPresentChatBUserA = !chatBUserA.adMins.find(({ userId }) => userId === userToDeleteId)
                const isDeletedUserNotPresentChatBUserB = !chatBUserB.adMins.find(({ userId }) => userId === userToDeleteId)
                const isDeletedUserNotPresentChatBUserC = !chatBUserC.adMins.find(({ userId }) => userId === userToDeleteId)
                const isDeletedUserNotPresentChatBUserD = !chatBUserD.adMins.find(({ userId }) => userId === userToDeleteId)
                const booleanValsIsDeletedUserNotPresent = [isDeletedUserNotPresentChatBUserD, isDeletedUserNotPresentChatBUserC, isDeletedUserNotPresentChatBUserB, isDeletedUserNotPresentChatBUserA]
                assert.equal(booleanValsIsDeletedUserNotPresent.every(val => val === true), true);
                done();
            }).catch(error => {
                if (error) {
                    console.error('Deleted user is still present in chatB: ', error);
                    assert.fail();
                }
            })
        })

        it('Testing if the same main admin for all users in the chatB.', done => {
            User.find({ id: { $in: [userAId, userBId, userCId, userDId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId)
                const userB = users.find(({ id }) => id === userBId)
                const userC = users.find(({ id }) => id === userCId);
                const userD = users.find(({ id }) => id === userDId);
                const chatBUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserD = userD.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserAMainAdminId = chatBUserA.adMins.find(({ isMain }) => isMain).userId
                const chatBUserBMainAdminId = chatBUserB.adMins.find(({ isMain }) => isMain).userId
                const chatBUserCMainAdminId = chatBUserC.adMins.find(({ isMain }) => isMain).userId
                const chatBUserDMainAdminId = chatBUserD.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdForAllChats = [chatBUserAMainAdminId, chatBUserBMainAdminId, chatBUserCMainAdminId, chatBUserDMainAdminId];
                const areStrings = mainAdminIdForAllChats.every(userId => typeof userId === 'string');
                const areNotUndefined = mainAdminIdForAllChats.every(userId => userId !== undefined);
                if (areStrings && areNotUndefined) {
                    assert.equal(mainAdminIdForAllChats.every(userId => userId === chatBUserAMainAdminId), true)
                } else {
                    assert.fail();
                }
                done()
            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                } ha
            })
        })

        it('Is main admin either userA, b, c, or d for chatB', done => {
            User.find({ id: { $in: [userAId, userBId, userDId, userCId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId)
                const userB = users.find(({ id }) => id === userBId)
                const userC = users.find(({ id }) => id === userCId);
                const userD = users.find(({ id }) => id === userDId);
                const chatBUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserD = userD.conversations.find(({ conversationId }) => conversationId === conversationBId)
                const chatBUserAMainAdminId = chatBUserA.adMins.find(({ isMain }) => isMain).userId
                const chatBUserBMainAdminId = chatBUserB.adMins.find(({ isMain }) => isMain).userId
                const chatBUserCMainAdminId = chatBUserC.adMins.find(({ isMain }) => isMain).userId
                const chatBUserDMainAdminId = chatBUserD.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdForAllChats = [chatBUserAMainAdminId, chatBUserBMainAdminId, chatBUserCMainAdminId, chatBUserDMainAdminId];
                const areStrings = mainAdminIdForAllChats.every(userId => typeof userId === 'string');
                const areNotUndefined = mainAdminIdForAllChats.every(userId => userId !== undefined);
                if (areNotUndefined && areStrings) {
                    const isMainAdminSameForAllChats = mainAdminIdForAllChats.every(userId => userId === chatBUserAMainAdminId);
                    if (isMainAdminSameForAllChats) {
                        assert.equal(mainAdminIdForAllChats.every(userId => [userBId, userCId].includes(userId)), true)
                        done()
                    } else {
                        assert.fail()
                    }
                } else {
                    assert.fail()

                }

            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })
        // end of testing for conversationB

        // testing for conversationC
        it('deleted user was deleted from chatB in all chats of users in chatC', done => {
            User.find({ id: { $in: [userAId, userBId, userDId] } }, { conversations: 1, id: 1 }).then(users => {
                console.log('users: ', users)
                const userA = users.find(({ id }) => id === userAId);
                const userB = users.find(({ id }) => id === userBId);
                const userD = users.find(({ id }) => id === userDId);
                const chatCUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserD = userD.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const allChatUsers = [...chatCUserA.conversationUsers, ...chatCUserB.conversationUsers, ...chatCUserD.conversationUsers]
                const areStrings = allChatUsers.every(val => typeof val === 'string');
                if (areStrings) {
                    const isDeletedUserNotPresentChatCUserA = !chatCUserA.conversationUsers.find(userId => userId === userToDeleteId)
                    const isDeletedUserNotPresentChatCUserB = !chatCUserB.conversationUsers.find(userId => userId === userToDeleteId)
                    const isDeletedUserNotPresentChatCUserC = !chatCUserD.conversationUsers.find(userId => userId === userToDeleteId)
                    const booleanValsIsDeletedUserNotPresent = [isDeletedUserNotPresentChatCUserA, isDeletedUserNotPresentChatCUserB, isDeletedUserNotPresentChatCUserC];
                    assert.equal(booleanValsIsDeletedUserNotPresent.every(val => val === true), true);
                    done();
                } else {
                    assert.fail()
                }

            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        });

        it("Deleted user is not present as an admin in all users' chats of chatC.", done => {
            User.find({ id: { $in: [userAId, userBId, userDId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId);
                const userB = users.find(({ id }) => id === userBId);
                const userD = users.find(({ id }) => id === userDId);
                const chatCUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserD = userD.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const isDeletedUserNotAdminChatCUserA = !chatCUserA.adMins.find(({ userId }) => userId === userToDeleteId)
                const isDeletedUserNotAdminChatCUserB = !chatCUserB.adMins.find(({ userId }) => userId === userToDeleteId)
                const isDeletedUserNotAdminChatCUserD = !chatCUserD.adMins.find(({ userId }) => userId === userToDeleteId)
                const booleanValsIsDeletedUserNotPresent = [isDeletedUserNotAdminChatCUserA, isDeletedUserNotAdminChatCUserB, isDeletedUserNotAdminChatCUserD];
                assert.equal(booleanValsIsDeletedUserNotPresent.every(val => val === true), true)
                done()
            }).catch(error => {
                if (error) {
                    console.error('Deleted user is still present in chatB: ', error);
                    assert.fail();
                }
            })
        })

        it('Testing if the same main admin for all users in chatC.', done => {
            User.find({ id: { $in: [userAId, userBId, userDId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId);
                const userB = users.find(({ id }) => id === userBId);
                const userD = users.find(({ id }) => id === userDId);
                const chatCUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserD = userD.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const mainAdminIdChatCUserA = chatCUserA.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdChatCUserB = chatCUserB.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdChatCUserC = chatCUserD.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdsForAllUsersChats = [mainAdminIdChatCUserA, mainAdminIdChatCUserB, mainAdminIdChatCUserC];
                const areNotUndefined = mainAdminIdsForAllUsersChats.every(userId => userId !== undefined);
                const areStrings = mainAdminIdsForAllUsersChats.every(userId => typeof userId === 'string');
                if (areStrings && areNotUndefined) {
                    assert.equal(mainAdminIdsForAllUsersChats.every(userId => userId === mainAdminIdChatCUserA), true)
                    done()
                } else {
                    assert.fail()
                }
            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })

        it('Is main admin either userA, B, or D for chatC', done => {
            User.find({ id: { $in: [userAId, userBId, userDId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId);
                const userB = users.find(({ id }) => id === userBId);
                const userD = users.find(({ id }) => id === userDId);
                const chatCUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserD = userD.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const mainAdminIdChatCUserA = chatCUserA.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdChatCUserB = chatCUserB.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdChatCUserD = chatCUserD.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdsForAllUsersChats = [mainAdminIdChatCUserA, mainAdminIdChatCUserB, mainAdminIdChatCUserD];
                const areNotUndefined = mainAdminIdsForAllUsersChats.every(userId => userId !== undefined);
                const areStrings = mainAdminIdsForAllUsersChats.every(userId => typeof userId === 'string');
                if (areStrings && areNotUndefined) {
                    assert.equal(mainAdminIdsForAllUsersChats.every(userId => [userAId, userBId, userDId].includes(userId)), true)
                    done()
                } else {
                    assert.fail()
                }

            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })
        // end of testing for conversationC

        // start of testing for conversationD
        it('deleted user was deleted from chatB in all chats of users in chatD', done => {
            User.find({ id: { $in: [userAId, userCId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId);
                const userC = users.find(({ id }) => id === userCId);
                const chatDUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationDId)
                const chatDUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationDId)
                const allChatUsers = [...chatDUserA.conversationUsers, ...chatDUserC.conversationUsers]
                const areStrings = allChatUsers.every(val => typeof val === 'string');
                if (areStrings) {
                    const isDeletedUserNotPresentChatCUserA = !chatDUserA.conversationUsers.find(userId => userId === userToDeleteId)
                    const isDeletedUserNotPresentChatCUserB = !chatDUserC.conversationUsers.find(userId => userId === userToDeleteId)
                    const booleanValsIsDeletedUserNotPresent = [isDeletedUserNotPresentChatCUserA, isDeletedUserNotPresentChatCUserB];
                    assert.equal(booleanValsIsDeletedUserNotPresent.every(val => val === true), true);
                    done();
                } else {
                    assert.fail()
                }

            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        });


        it("Deleted user is not present as an admin in all users' chats of chatD.", done => {
            User.find({ id: { $in: [userAId, userCId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId);
                const userC = users.find(({ id }) => id === userCId);
                const chatCUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationDId)
                const chatCUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationDId)
                const isDeletedUserNotAdminChatCUserA = !chatCUserA.adMins.find(({ userId }) => userId === userToDeleteId)
                const isDeletedUserNotAdminChatCUserB = !chatCUserC.adMins.find(({ userId }) => userId === userToDeleteId)
                const booleanValsIsDeletedUserNotPresent = [isDeletedUserNotAdminChatCUserA, isDeletedUserNotAdminChatCUserB];
                assert.equal(booleanValsIsDeletedUserNotPresent.every(val => val === true), true)
                done()
            }).catch(error => {
                if (error) {
                    console.error('Deleted user is still present in chatB: ', error);
                    assert.fail();
                }
            })
        })

        it('Testing if the same main admin for all users in chatD.', done => {
            User.find({ id: { $in: [userAId, userCId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId);
                const userC = users.find(({ id }) => id === userCId);
                const chatDUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationDId)
                const chatDUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationDId)
                const mainAdminIdChatDUserA = chatDUserA.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdChatDUserC = chatDUserC.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdsForAllUsersChats = [mainAdminIdChatDUserA, mainAdminIdChatDUserC];
                const areNotUndefined = mainAdminIdsForAllUsersChats.every(userId => userId !== undefined);
                const areStrings = mainAdminIdsForAllUsersChats.every(userId => typeof userId === 'string');
                if (areStrings && areNotUndefined) {
                    assert.equal(mainAdminIdsForAllUsersChats.every(userId => userId === mainAdminIdChatDUserA), true)
                    done()
                } else {
                    assert.fail()
                }
            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })

        it('Is main admin either userA, B, or D for chatC', done => {
            User.find({ id: { $in: [userAId, userBId, userDId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId);
                const userB = users.find(({ id }) => id === userBId);
                const userD = users.find(({ id }) => id === userDId);
                const chatCUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserB = userB.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const chatCUserD = userD.conversations.find(({ conversationId }) => conversationId === conversationCId)
                const mainAdminIdChatCUserA = chatCUserA.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdChatCUserB = chatCUserB.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdChatCUserC = chatCUserD.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdsForAllUsersChats = [mainAdminIdChatCUserA, mainAdminIdChatCUserB, mainAdminIdChatCUserC];
                const areNotUndefined = mainAdminIdsForAllUsersChats.every(userId => userId !== undefined);
                const areStrings = mainAdminIdsForAllUsersChats.every(userId => typeof userId === 'string');
                if (areStrings && areNotUndefined) {
                    assert.equal(mainAdminIdsForAllUsersChats.every(userId => [userAId, userBId, userDId].includes(userId)), true)
                    done()
                } else {
                    assert.fail()
                }

            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })

        it('Is main admin either userA or C for chatD', done => {
            User.find({ id: { $in: [userAId, userCId] } }, { conversations: 1, id: 1 }).then(users => {
                const userA = users.find(({ id }) => id === userAId);
                const userC = users.find(({ id }) => id === userCId);
                const chatDUserA = userA.conversations.find(({ conversationId }) => conversationId === conversationDId)
                const chatDUserC = userC.conversations.find(({ conversationId }) => conversationId === conversationDId)
                const mainAdminIdChatDUserA = chatDUserA.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdChatDUserC = chatDUserC.adMins.find(({ isMain }) => isMain).userId
                const mainAdminIdsForAllUsersChats = [mainAdminIdChatDUserC, mainAdminIdChatDUserA];
                const areNotUndefined = mainAdminIdsForAllUsersChats.every(userId => userId !== undefined);
                const areStrings = mainAdminIdsForAllUsersChats.every(userId => typeof userId === 'string');
                if (areStrings && areNotUndefined) {
                    assert.equal(mainAdminIdsForAllUsersChats.every(userId => [userAId, userCId].includes(userId)), true)
                    done()
                } else {
                    assert.fail()
                }

            }).catch(error => {
                if (error) {
                    console.error('An error has occurred: ', error);
                    assert.fail();
                }
            })
        })



    }



    it('all reply likes were deleted', done => {
        BlogPost.findOne(({ _id: '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76' })).then(post => {
            const commentReplyLikedDeleted = post.comments.find(({ commentId }) => commentId === '2c305eed-c5ea-4a23-9ad3-03d501a2aec6');
            const replyLikedDeleted = commentReplyLikedDeleted.replies.find(({ replyId }) => replyId === 'dc078f7f-faaa-4acf-a2c0-2b669cbe4ec4');
            const wasReplyLikeDeleted = !replyLikedDeleted.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId)

            assert.equal(wasReplyLikeDeleted, true)
            done();
        })
            .catch(error => {
                if (error) {
                    console.error('Reply like by deleted user is still present: ', error);
                    assert.fail()
                };
                done()
            })
    });

    it('all comment likes were deleted', done => {
        BlogPost.findOne({ _id: '3de32081-0850-42d4-863a-de86c3d4bc31' }).then(blogPost => {
            const commentLiked = blogPost.comments.find(({ commentId }) => commentId === '17e467e2-afaf-44a4-b86a-dac1dfd2e4d6')
            const isCommentNotLiked = !commentLiked.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId)
            assert.equal(isCommentNotLiked, true)
            done();
        }).catch(error => {
            if (error) {
                console.error('Comment like was not deleted: ', error)
                assert.fail()
            };
            done();
        })
    });

    it('all post likes were deleted', done => {
        BlogPost.findOne({ _id: '3de32081-0850-42d4-863a-de86c3d4bc31' }).then(post => {
            const isPostNotLiked = !post.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId);
            assert.equal(isPostNotLiked, true);
            done();
        }).catch(error => {
            if (error) {
                console.error('Post like was not deleted: ', error);
                assert.fail();
            };
            done();
        })
    })

    it('all comments were deleted', done => {
        BlogPost.findOne({ _id: '228f1140-f2e6-42a3-a152-dde27ac17445' }).then(blogPost => {
            const wasCommentDeleted = !blogPost.comments.find(({ userId }) => userId === userToDeleteId)
            assert.equal(wasCommentDeleted, true)
            done();
        }).catch(error => {
            if (error) {
                console.error('An error has occurred in deleting comments by deleted user: ', error)
                assert.fail('An error has occurred')
            }
            done();
        })
    })

    it('all replies were deleted', done => {
        BlogPost.findOne(({ _id: '228f1140-f2e6-42a3-a152-dde27ac17445' }))
            .then(blogPost => {
                const targetComment = blogPost.comments.find(({ commentId }) => commentId === '8603af61-93d7-4a0d-8a1a-9428959dc6f4')
                const repliesByDeletedUser = targetComment.replies.filter(({ userId }) => userId === userToDeleteId);
                assert.equal(repliesByDeletedUser.length, 0)
                done();
            }).catch(error => {
                if (error) {
                    console.error('Replies were not deleted from post: ', error)
                    assert.fail()
                }
                done();
            })
    });

    it('All posts are deleted from deleted user.', done => {
        BlogPost.find({ authorId: userToDeleteId })
            .then(posts => {
                assert.equal(posts.length, 0);
                done();
            }).catch(error => {
                if (error) {
                    console.error('Fail to delete post made by the target user: ', error)
                    assert.fail();
                };
                done();
            })
    });

    if (isFollowingUsers) {
        it('checking if deleted user is a follower of userA', done => {
            User.findOne({ id: userAId }, { followers: 1 }).then(user => {
                console.log('userA: ', user)
                const isDeletedUserNotAFollower = !user.followers.find(({ userId }) => userId === userToDeleteId);
                assert.equal(isDeletedUserNotAFollower, true);
                done()
            }).catch(error => {
                if (error) {
                    console.error('Deleted user is still a follower of userA: ', error);
                    assert.fail();
                }
                done()
            })
        })

        it('checking if deleted user is a follower of userB', done => {
            User.findOne({ id: userBId }, { followers: 1 }).then(user => {
                const isNotPresentInUserBFollowers = !user.followers.map(({ userId }) => userId).includes(userToDeleteId)
                assert.equal(isNotPresentInUserBFollowers, true);
                done();
            }).catch(error => {
                if (error) {
                    console.error('Deleted user is still a follower of userB: ', error);
                    assert.fail();
                }
                done()
            })
        })






        it('checking if deleted user is a follower of userD', done => {
            User.findOne({ id: userDId }, { followers: 1 }).then(user => {
                const isNotPresentInUserDFollowers = !user.followers.map(({ userId }) => userId).includes(userToDeleteId)
                assert.equal(isNotPresentInUserDFollowers, true);
                done();
            }).catch(error => {
                if (error) {
                    console.error('Deleted user is still a follower of userD: ', error);
                    assert.fail();
                }
                done()
            })
        })
    }

    if (hasFollowers) {
        it('checking if deleted user is being followed by userB', done => {
            User.findOne({ id: userBId }, { followers: 1, activities: 1 }).then(user => {
                const isNotPresentInUserBFollowing = !user.activities.following.map(({ userId }) => userId).includes(userToDeleteId)
                assert.equal(isNotPresentInUserBFollowing, true);
                done();
            }).catch(error => {
                if (error) {
                    console.error('Deleted user is still being followed by userB: ', error);
                    assert.fail();
                }
                done()
            })
        })

        it('checking if deleted user is being followed by userC', done => {
            User.findOne({ id: userCId }, { followers: 1, activities: 1 }).then(user => {
                const isNotPresentInUserCFollowing = !user.activities.following.map(({ userId }) => userId).includes(userToDeleteId)
                assert.equal(isNotPresentInUserCFollowing, true);
                done();
            }).catch(error => {
                if (error) {
                    console.error('Deleted user is still being followed by userC: ', error);
                    assert.fail();
                }
                done();
            })
        })

        it('checking if deleted user is being followed by userD', done => {
            User.findOne({ id: userDId }, { followers: 1, activities: 1 }).then(user => {
                const isNotPresentInUserDFollowing = !user.activities.following.map(({ userId }) => userId).includes(userToDeleteId)
                assert.equal(isNotPresentInUserDFollowing, true);
                done();
            }).catch(error => {
                if (error) {
                    console.error('Deleted user is still being followed by userD: ', error);
                    assert.fail();
                }
                done();
            })
        });
    }



    it('Checking if deleted user exist.', done => {
        User.findOne({ id: userToDeleteId }).then(user => {
            assert.equal(user, null);
            done();
        }).catch(error => {
            if (error) {
                console.error('Deleted user is still exists: ', error);
                assert.fail();
            }
            done()
        })
    })
})

after(() => {
    BlogPost.deleteMany(
        {
            // _id: { $in: ['228f1140-f2e6-42a3-a152-dde27ac17445', '32f6243e-c851-40b3-998e-6af80e070e78', '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76', '3de32081-0850-42d4-863a-de86c3d4bc31', '2c7ea4fb-960a-47b9-bfa5-2d756cfbc4b0'] }
            _id: { $in: postsToDelete }
        },
        (error, numsAffected) => {
            if (error) {
                console.error('An error has occurred in deleting dummy posts: ', error);
            } else {
                console.log('Dummy posts were deleted: ', numsAffected)
            }
        }
    );
    User.deleteMany(
        {
            id: { $in: usersToDelete }
        },
        (error, numsAffected) => {
            if (error) {
                console.error('An error has occurred in deleting dummy users in the User collection of DB: ', error);
            } else {
                console.log('Dummy users were deleted: ', numsAffected)
            }
        }
    )

})


