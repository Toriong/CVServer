
const BlogPost = require("../models/blogPost")
const User = require("../models/user");
const assert = require("assert")

const userToDeleteId = 'd912e3db-d8ff-4a7f-aba7-6433170ca10c';


// separate all the saves into there own test
describe('Delete user', () => {
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

    beforeEach(done => {
        userToDelete = new User({ _id: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c' })
        userToDelete.save()
            .then(() => { done() });
    });

    const userToDeleteFollowing = ['a3bb23d5-84ad-40e9-84c9-1065fac0d255', '9f381a8d-4ced-4598-9425-c6754047433c', '7608fb16-6806-409a-bd28-3ab364c029fb'];
    const userToDeleteFollowers = ['9f381a8d-4ced-4598-9425-c6754047433c', 'aae2b14a-0d2f-4755-9874-d99a9387ec16', 'aae2b14a-0d2f-4755-9874-d99a9387ec16', '7608fb16-6806-409a-bd28-3ab364c029fb']

    beforeEach(done => {
        userA = new User(
            {
                _id: 'a3bb23d5-84ad-40e9-84c9-1065fac0d255',
                followers:
                    [
                        {
                            userId: userToDeleteId
                        },
                    ]
            }
        )
        userA.save()
            .then(() => { done() });
    })

    beforeEach(done => {
        userB = new User(
            {
                _id: '9f381a8d-4ced-4598-9425-c6754047433c',
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
                }
            })
        userB.save()
            .then(() => { done() });
    })
    beforeEach(done => {
        userC = new User(
            {
                _id: 'aae2b14a-0d2f-4755-9874-d99a9387ec16',
                activities:
                {
                    following:
                        [
                            {
                                userId: userToDeleteId
                            }
                        ]
                }
            }

        )
        userC.save()
            .then(() => { done() });
    })
    beforeEach(done => {
        userD = new User(
            {
                _id: '7608fb16-6806-409a-bd28-3ab364c029fb',
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
                }
            }
        )
        userD.save()
            .then(() => { done() });
    })

    beforeEach(done => {
        // the first comment will be deleted 
        blogPost1 = new BlogPost({
            _id: '228f1140-f2e6-42a3-a152-dde27ac17445',
            comments:
                [
                    {
                        commentId: 'b6f9534e-fdbc-44b9-be4a-f7bc3d545dbf',
                        userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
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

    beforeEach(done => {
        // the whole post will be deleted 
        blogPost2 = new BlogPost(
            {
                _id: '32f6243e-c851-40b3-998e-6af80e070e78',
                authorId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c',
            }
        )
        blogPost2.save()
            .then(() => { done() })
    })

    beforeEach(done => {
        // delete all of the reply likes 
        blogPost3 = new BlogPost({
            _id: '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76',
            comments:
                [
                    {
                        commentId: '6efc5d02-af8a-46cd-a837-438986cf4098',
                        userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28'
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
                        userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28'
                    }
                ]
        })
        blogPost3.save()
            .then(() => { done() })
    });

    beforeEach(done => {
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
                        userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28'
                    }
                ]
        });
        blogPost4.save()
            .then(() => { done() })
    })

    beforeEach(done => {
        // delete this post
        blogPost5 = new BlogPost(
            {
                _id: '2c7ea4fb-960a-47b9-bfa5-2d756cfbc4b0',
                authorId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
            }
        );
        blogPost5.save()
            .then(() => { done() })
    });

    it('delete all occurrence of the userToDelete in database', () => {
        // to delete in the database:
        // BlogPost collection
        // the reply likes
        // comments likes
        // replies
        // comments
        // posts

        // User collection
        // as follower
        // being followed
        // the user profile itself
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
                    $updateMany: {
                        'filter': {},
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
                    $updateMany: {
                        'filter': {},
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
                    $updateMany: {
                        'filter': {},
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
                    $updateMany: {
                        'filter': {},
                        'update':
                        {
                            $pull: {
                                'comments': { userId: userToDeleteId }
                            }
                        }
                    }
                }
            ]
        ).then(() => {
            const post1 = '2c7ea4fb-960a-47b9-bfa5-2d756cfbc4b0';
            const post2 = '32f6243e-c851-40b3-998e-6af80e070e78';
            // '3de32081-0850-42d4-863a-de86c3d4bc31' post like and a comment like was deleted
            // '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76', reply like was deleted
            // '228f1140-f2e6-42a3-a152-dde27ac17445', a comment and a reply was deleted 
            BlogPost.find(({ _id: ['3de32081-0850-42d4-863a-de86c3d4bc31', '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76', '228f1140-f2e6-42a3-a152-dde27ac17445'] })).then(posts => {
                const postIds = posts.map(({ _id }) => _id);
                const postCommentAndReplyDeleted = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify('228f1140-f2e6-42a3-a152-dde27ac17445'))
                const targetCommentForDeletedComment = postCommentAndReplyDeleted.comments.find(({ commentId }) => commentId === '8603af61-93d7-4a0d-8a1a-9428959dc6f4')
                const postReplyLikeDeleted = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify('2c305eed-c5ea-4a23-9ad3-03d501a2aec6'))
                const commentReplyLikedDeleted = postReplyLikeDeleted.comments.find(({ commentId }) => commentId === '2c305eed-c5ea-4a23-9ad3-03d501a2aec6');
                const replyLikedDeleted = commentReplyLikedDeleted.replies.find(({ replyId }) => replyId === 'dc078f7f-faaa-4acf-a2c0-2b669cbe4ec4');
                const postLiked = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify('3de32081-0850-42d4-863a-de86c3d4bc31'))
                const commentLiked = postLiked.comments.find(({ commentId }) => commentId === '17e467e2-afaf-44a4-b86a-dac1dfd2e4d6')
                const wasPost1Deleted = postIds.includes(post1);
                const wasPost2Deleted = postIds.includes(post2);
                const wasCommentDeleted = postCommentAndReplyDeleted.comments.some(({ userId }) => userId !== userToDeleteId)
                const wasReplyDeleted = targetCommentForDeletedComment.replies.some(({ userId }) => userId !== userToDeleteId);
                const wasReplyLikeDeleted = !replyLikedDeleted.userIdsOfLikes.find(({ userId }) => userId === userToDeletedId)
                const isPostNotLiked = !postLiked.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId);
                const isCommentNotLiked = !commentLiked.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId)

                assert(isCommentNotLiked === true);
                assert(isPostNotLiked === true)
                assert(wasReplyLikeDeleted === true)
                assert(wasReplyDeleted === true)
                assert(wasCommentDeleted === true)
                assert(wasPost1Deleted === true)
                assert(wasPost2Deleted === true)
            })
        })

        User.bulkWrite(
            [
                {
                    // delete the user from users following
                    $updateMany: {
                        'filter': { _id: { $in: userToDeleteFollowing } },
                        'update':
                        {
                            $pull: {
                                'activities.following': { userId: userToDeleteId }
                            }
                        }
                    }
                },
                {
                    // delete the user from users following
                    $updateMany: {
                        'filter': { _id: { $in: userToDeleteFollowers } },
                        'update':
                        {
                            $pull: {
                                'followers': { userId: userToDeleteId }
                            }
                        }
                    }
                },
                {
                    $deleteOne: {
                        'filter': { _id: userToDeleteId }
                    }
                }
            ]
        ).then(() => {
            const userIds = [...new Set([...userToDeleteFollowers, ...userToDeleteFollowing, userToDeleteId])]
            User.find(
                { _id: { $in: userIds } }
            ).then(users => {
                const isDeletedAccountNotPresent = !users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(userToDeleteId))
                const userA = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify('a3bb23d5-84ad-40e9-84c9-1065fac0d255'));
                const userB = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify('9f381a8d-4ced-4598-9425-c6754047433c'))
                const userC = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify('aae2b14a-0d2f-4755-9874-d99a9387ec16'))
                const userD = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify('7608fb16-6806-409a-bd28-3ab364c029fb'))
                const { activities: userDActivities, followers: userDFollowers } = userD;
                const { followers: userAFollowers } = userA
                const { activities: userBActivities, followers: userBFollowers } = userB
                const { activities: userCActivities, } = userC
                const isNotPresentInUserBFollowers = !userBFollowers.map(({ userId }) => userId).includes(userToDeleteId)
                const isNotPresentInUserBFollowing = !userBActivities.following.map(({ userId }) => userId).includes(userToDeleteId)
                const isNotPresentInUserDFollowers = !userDFollowers.map(({ userId }) => userId).includes(userToDeleteId)
                const isNotPresentInUserDFollowing = !userDActivities.following.map(({ userId }) => userId).includes(userToDeleteId)


                console.log({ userAFollowers })
                assert(userAFollowers.length === 0)
                asset(userCActivities.following.length === 0)
                assert(isNotPresentInUserBFollowers === true)
                assert(isNotPresentInUserBFollowing === true)
                assert(isNotPresentInUserDFollowers === true)
                assert(isNotPresentInUserDFollowing === true)
                assert(isDeletedAccountNotPresent === true)
            })
        })

    })
})