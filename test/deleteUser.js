
const BlogPost = require("../models/blogPost")
const mongoose = require('mongoose');
const User = require("../models/user");
// const assert = require("assert");
const { expect, assert } = require("chai");
const dbconnection = "mongodb+srv://gtorio:simba1997@clustercv.blvqa.mongodb.net/CVBlog"
const userToDeleteId = 'd912e3db-d8ff-4a7f-aba7-6433170ca10c';
const postsToDelete = ['228f1140-f2e6-42a3-a152-dde27ac17445', '32f6243e-c851-40b3-998e-6af80e070e78', '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76', '3de32081-0850-42d4-863a-de86c3d4bc31', '2c7ea4fb-960a-47b9-bfa5-2d756cfbc4b0']
const usersToDelete = ['d912e3db-d8ff-4a7f-aba7-6433170ca10c', 'a3bb23d5-84ad-40e9-84c9-1065fac0d255', '9f381a8d-4ced-4598-9425-c6754047433c', 'aae2b14a-0d2f-4755-9874-d99a9387ec16', '7608fb16-6806-409a-bd28-3ab364c029fb']

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

// describe('Delete comment and reply from post', () => {
//     let blogPost1;

//     before(done => {
//         // the first comment will be deleted 
//         blogPost1 = new BlogPost({
//             _id: '228f1140-f2e6-42a3-a152-dde27ac17445',
//             comments:
//                 [
//                     {
//                         commentId: 'b6f9534e-fdbc-44b9-be4a-f7bc3d545dbf',
//                         userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
//                     },
//                     {
//                         commentId: '8603af61-93d7-4a0d-8a1a-9428959dc6f4',
//                         userId: 'fba7cdea-b782-41f5-9fb3-e1964ac7a3c1',
//                         replies:
//                             // delete the replies
//                             [
//                                 {
//                                     replyId: '68a56a09-ec6f-45c9-a162-a01d02d8f7d7',
//                                     userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
//                                 },
//                                 {
//                                     replyId: '86c7258b-ce3b-4e10-81b9-b1d2bf0dae69',
//                                     userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
//                                 }
//                             ]
//                     }
//                 ]
//         })

//         blogPost1.save()
//             .then(() => {
//                 console.log('post was saved')
//                 done()
//             })
//             .catch(error => { console.error('An error has occurred: ', error); });
//     })

//     it("Checking if comment was deleted from target post. ", done => {
//         BlogPost.bulkWrite(
//             [
//                 {
//                     // delete the replies
//                     updateMany: {
//                         'filter': {},
//                         'update':
//                         {
//                             $pull: {
//                                 'comments.$[comment].replies': { userId: userToDeleteId }
//                             }
//                         },
//                         'arrayFilters': [{ 'comment.commentId': { $exists: true } }]
//                     }
//                 },
//                 {
//                     // delete the comments 
//                     updateMany: {
//                         'filter': {},
//                         'update':
//                         {
//                             $pull: {
//                                 'comments': { userId: userToDeleteId }
//                             }
//                         }
//                     }
//                 }
//             ]
//         )
//             .then(() => BlogPost.findOne({ _id: '228f1140-f2e6-42a3-a152-dde27ac17445' }))
//             .then(blogPost => {
//                 const wasCommentDeleted = !blogPost.comments.find(({ userId }) => userId === userToDeleteId)
//                 assert.equal(wasCommentDeleted, true)
//                 done();
//             }).catch(error => {
//                 if (error) {
//                     console.error('An error has occurred in deleting comment and reply by deleted user: ', error)
//                     assert.fail('An error has occurred')
//                 }
//                 done();
//             })
//     })
//     it("Checking if replies were deleted from target post", done => {
//         BlogPost.findOne(({ _id: '228f1140-f2e6-42a3-a152-dde27ac17445' }))
//             .then(blogPost => {
//                 const targetComment = blogPost.comments.find(({ commentId }) => commentId === '8603af61-93d7-4a0d-8a1a-9428959dc6f4')
//                 const repliesByDeletedUser = targetComment.replies.filter(({ userId }) => userId === userToDeleteId);
//                 assert.equal(repliesByDeletedUser.length, 0)
//                 done();
//             }).catch(error => {
//                 if (error) {
//                     console.error('Replies were not deleted from post: ', error)
//                     assert.fail()
//                 }
//                 done();
//             })
//     })
// });

// describe('delete blog post ', () => {
//     let blogPost1; let blogPost2;
//     before(done => {
//         // the whole post will be deleted 
//         blogPost1 = new BlogPost(
//             {
//                 _id: '32f6243e-c851-40b3-998e-6af80e070e78',
//                 authorId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c',
//             }
//         );
//         blogPost1.save().
//             then(() => {
//                 console.log('BlogPost1 to be deleted was saved.')
//                 done();
//             });

//     })
//     before(done => {
//         blogPost2 = new BlogPost(
//             {
//                 _id: 'c19e1671-ed0b-4865-af14-696eecacb493',
//                 authorId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c',
//             }
//         )
//         blogPost2.save()
//             .then(() => {
//                 console.log('BlogPost2 to be deleted was saved.')
//                 done();
//             });
//     })
//     it('Will delete post made by the user that was deleted.', done => {
//         BlogPost.bulkWrite(
//             [
//                 {
//                     // delete the posts made by the deleted user
//                     deleteMany: {
//                         'filter': { authorId: userToDeleteId }
//                     }
//                 }
//             ]
//         )
//             .then(() => BlogPost.find({ authorId: userToDeleteId }))
//             .then(posts => {
//                 assert.equal(posts.length, 0);
//                 done();
//             }).catch(error => {
//                 if (error) {
//                     console.error('Fail to delete post made by the target user: ', error)
//                     assert.fail();
//                 };
//                 done();
//             })
//     })
// })
describe('delete reply likes', () => {
    let blogPost;
    before(done => {
        // delete all of the reply likes 
        blogPost = new BlogPost({
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
                ],
            totalRepliesAndComments: 5
        })
        blogPost.save()
            .then(() => { done() })
    });

    before(done => {
        BlogPost.bulkWrite([
            {
                // delete reply likes
                updateMany: {
                    'filter': { "comments": { $exists: true }, totalRepliesAndComments: { $gt: 0 } },
                    'update':
                    {
                        $pull: {
                            'comments.$[comment].replies.$[reply].userIdsOfLikes': { userId: userToDeleteId }
                        }
                    },
                    'arrayFilters': [{ 'comment.commentId': { $exists: true } }, { 'reply.replyId': { $exists: true } }]
                }
            },
        ]).then(() => { done() }).catch(error => {
            if (error) {
                console.error('An error has occurred in deleting reply like by deleted user: ', error)
            }
        })
    })

    it('will delete all reply likes by deleted user', () => {

        BlogPost.findOne({ _id: '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76' })
            .then(post => {
                const commentReplyLikedDeleted = post.comments.find(({ commentId }) => commentId === '2c305eed-c5ea-4a23-9ad3-03d501a2aec6');
                const replyLikedDeleted = commentReplyLikedDeleted.replies.find(({ replyId }) => replyId === 'dc078f7f-faaa-4acf-a2c0-2b669cbe4ec4');
                const wasReplyLikeDeleted = !replyLikedDeleted.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId)
                assert.equal(wasReplyLikeDeleted, true)
                done();
            }).catch(error => {
                if (error) {
                    console.error('Reply like by deleted user is still present: ', error);
                    assert.fail()
                };
            })
    })
})
// })

// describe('delete comment like and post like', () => {
//     let blogPost;
//     before(done => {
//         blogPost = new BlogPost({
//             _id: '3de32081-0850-42d4-863a-de86c3d4bc31',
//             // delete this like
//             userIdsOfLikes: [{ userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c' }],
//             comments:
//                 [
//                     {
//                         commentId: '17e467e2-afaf-44a4-b86a-dac1dfd2e4d6',
//                         userId: '97c1ba42-4483-475b-9de2-0db6b936fcc9',
//                         userIdsOfLikes:
//                             // delete this like
//                             [
//                                 {
//                                     userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
//                                 },
//                                 {
//                                     userId: '6112d39e-2f04-4312-b5fa-72138adce6aa'
//                                 }
//                             ]
//                     },
//                     {
//                         commentId: '1bad6510-89d3-464a-af0d-2eed1b2c44f6',
//                         replies:
//                             [
//                                 {
//                                     replyId: '5bc41431-4c47-46d5-9b8f-3c41eaf2220e',
//                                     userId: '8c3c10ce-5432-43b5-bbf3-966859143fc9',
//                                 },
//                                 {
//                                     replyId: '38fb0e9d-d2a0-42ab-b1df-cb6a14a2a3bf',
//                                     userId: '38fb0e9d-d2a0-42ab-b1df-cb6a14a2a3bf'
//                                 }
//                             ],
//                         userId: 'abb167b8-f3b8-4eab-91be-3b6a17cc4ccd'
//                     },
//                     {
//                         commentId: '2a22bcab-7043-4d2b-bd84-9565bba6099d',
//                         userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28'
//                     }
//                 ]
//         });
//         blogPost.save()
//             .then(() => {
//                 console.log('Dummy post was saved for comment like and post like deletion.')
//                 done()
//             })
//     })

//     it('comment like was deleted', done => {
//         BlogPost.bulkWrite(
//             [
//                 {
//                     // delete the comment likes
//                     updateMany: {
//                         'filter': {},
//                         'update':
//                         {
//                             $pull: {
//                                 'comments.$[comment].userIdsOfLikes': { userId: userToDeleteId }
//                             }
//                         },
//                         'arrayFilters': [{ 'comment.commentId': { $exists: true } }]
//                     }
//                 },
//                 {
//                     // delete the post like 
//                     updateMany: {
//                         'filter': {},
//                         'update':
//                         {
//                             $pull: {
//                                 'userIdsOfLikes': { userId: userToDeleteId }
//                             }
//                         }
//                     }
//                 }
//             ]
//         )
//             .then(() => BlogPost.findOne({ _id: '3de32081-0850-42d4-863a-de86c3d4bc31' }))
//             .then(blogPost => {
//                 const commentLiked = blogPost.comments.find(({ commentId }) => commentId === '17e467e2-afaf-44a4-b86a-dac1dfd2e4d6')
//                 const isCommentNotLiked = !commentLiked.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId)
//                 assert.equal(isCommentNotLiked, true)

//                 done();
//             }).catch(error => {
//                 if (error) {
//                     console.error('Comment like was not deleted: ', error)
//                     assert.fail()
//                 };
//                 done();
//             })
//     });

//     it('Post like was deleted.', done => {
//         BlogPost.findOne({ _id: '3de32081-0850-42d4-863a-de86c3d4bc31' }).then(post => {
//             const isPostNotLiked = !post.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId);
//             assert.equal(isPostNotLiked, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Post like was not deleted: ', error);
//                 assert.fail();
//             };
//             done();
//         })
//     })
// })

// describe("Delete all user's account, and delete user as a follower and following.", () => {
//     let userA, userB, userC, userD, userToDelete;
//     const userAId = 'a3bb23d5-84ad-40e9-84c9-1065fac0d255';
//     const userBId = '9f381a8d-4ced-4598-9425-c6754047433c';
//     const userCId = 'aae2b14a-0d2f-4755-9874-d99a9387ec16';
//     const userDId = '7608fb16-6806-409a-bd28-3ab364c029fb';

//     before(done => {
//         userToDelete = new User({ _id: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c' })
//         userToDelete.save()
//             .then(() => {
//                 console.log('userToDelete was created. ')
//                 done()
//             }).catch(error => {
//                 if (error) {
//                     console.error('Fail to save userToDelete: ', error)
//                 }
//             })
//     });

//     before(done => {
//         userA = new User(
//             {
//                 _id: userAId,
//                 followers:
//                     [
//                         {
//                             userId: userToDeleteId
//                         },
//                     ]
//             }
//         )
//         userA.save()
//             .then(() => {
//                 console.log('UserA was saved into the db.')
//                 done()
//             }).catch(error => {
//                 if (error) {
//                     console.error('Fail to save userA into the db: ', error);
//                 }
//             })
//     })

//     before(done => {
//         userB = new User(
//             {
//                 _id: userBId,
//                 followers:
//                     [
//                         {
//                             userId: userToDeleteId
//                         },
//                         {
//                             userId: 'df5b8625-2aae-4a35-b7ac-78de239dab46'
//                         }
//                     ],
//                 activities:
//                 {
//                     following:
//                         [
//                             {
//                                 userId: userToDeleteId
//                             },
//                             {
//                                 userId: 'df5b8625-2aae-4a35-b7ac-78de239dab46'
//                             }
//                         ]
//                 }
//             })
//         userB.save()
//             .then(() => {
//                 console.log('UserB is saved into the db.')
//                 done()
//             }).catch(error => {
//                 if (error) {
//                     console.error('Fail to save userB into the db: ', error);
//                 }
//             })
//     })
//     before(done => {
//         userC = new User(
//             {
//                 _id: userCId,
//                 activities:
//                 {
//                     following:
//                         [
//                             {
//                                 userId: userToDeleteId
//                             }
//                         ]
//                 }
//             }

//         )
//         userC.save()
//             .then(() => {
//                 console.log('userC is saved into the db.')
//                 done()
//             }).catch(error => {
//                 if (error) {
//                     console.error('Fail to save userC into the db.')
//                 }
//             })
//     })
//     before(done => {
//         userD = new User(
//             {
//                 _id: userDId,
//                 followers:
//                     [
//                         {
//                             userId: userToDeleteId
//                         },
//                         {
//                             userId: 'bfc449bc-5f4b-4bcf-a9bb-90bcbd174f00'
//                         }
//                     ],
//                 activities:
//                 {
//                     following:
//                         [
//                             {
//                                 userId: userToDeleteId
//                             },
//                             {
//                                 userId: 'ab2c19d9-3561-43d2-a4f6-e529b7ac9dfe'
//                             }
//                         ]
//                 }
//             }
//         )
//         userD.save()
//             .then(() => {
//                 console.log('userD is saved into the db.')
//                 done()
//             }).catch(error => {
//                 if (error) {
//                     console.error('Fail to save userD into the db.')
//                 }
//             })
//     });

//     before(done => {
//         const userToDeleteFollowers = ['a3bb23d5-84ad-40e9-84c9-1065fac0d255', '9f381a8d-4ced-4598-9425-c6754047433c', '7608fb16-6806-409a-bd28-3ab364c029fb'];
//         const userToDeleteFollowing = ['9f381a8d-4ced-4598-9425-c6754047433c', 'aae2b14a-0d2f-4755-9874-d99a9387ec16', '7608fb16-6806-409a-bd28-3ab364c029fb'];
//         User.bulkWrite(
//             [
//                 {
//                     // delete the user from users following
//                     updateMany: {
//                         'filter': { _id: { $in: userToDeleteFollowing } },
//                         'update':
//                         {
//                             $pull: {
//                                 'activities.following': { userId: userToDeleteId }
//                             }
//                         }
//                     }
//                 },
//                 {
//                     // delete the user from users following
//                     updateMany: {
//                         'filter': { _id: { $in: userToDeleteFollowers } },
//                         'update':
//                         {
//                             $pull: {
//                                 'followers': { userId: userToDeleteId }
//                             }
//                         }
//                     }
//                 },
//                 {
//                     deleteOne: {
//                         'filter': { _id: userToDeleteId }
//                     }
//                 }
//             ]
//         ).then(() => {
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('An error has occurred in inserting dummy data into the collection of user into the DB: ', error);
//             };
//             done();
//         })
//     });

//     it('checking if deleted user is a follower of userA', done => {
//         User.findOne({ _id: userAId }, { followers: 1 }).then(user => {
//             console.log('userA: ', user)
//             const isDeletedUserNotAFollower = !user.followers.find(({ userId }) => userId === userToDeleteId);
//             assert.equal(isDeletedUserNotAFollower, true);
//             done()
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still a follower of userA: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })

//     it('checking if deleted user is a follower of userB', done => {
//         User.findOne({ _id: userBId }, { followers: 1 }).then(user => {
//             const isNotPresentInUserBFollowers = !user.followers.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserBFollowers, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still a follower of userB: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })

//     it('checking if deleted user is being followed by userB', done => {
//         User.findOne({ _id: userBId }, { followers: 1, activities: 1 }).then(user => {
//             const isNotPresentInUserBFollowing = !user.activities.following.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserBFollowing, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still being followed by userB: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })

//     it('checking if deleted user is being followed by userC', () => {
//         User.findOne({ _id: userCId }, { followers: 1, activities: 1 }).then(user => {
//             const isNotPresentInUserCFollowing = !user.activities.following.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserCFollowing, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still being followed by userC: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })


//     it('checking if deleted user is a follower of userD', done => {
//         User.findOne({ _id: userDId }, { followers: 1 }).then(user => {
//             const isNotPresentInUserDFollowers = !user.followers.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserDFollowers, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still a follower of userD: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })

//     it('checking if deleted user is being followed by userD', done => {
//         User.findOne({ _id: userDId }, { followers: 1, activities: 1 }).then(user => {
//             const isNotPresentInUserDFollowing = !user.activities.following.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserDFollowing, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still being followed by userD: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     });

//     it('Checking if deleted user exist.', done => {
//         User.findOne({ _id: userToDeleteId }).then(user => {
//             assert.equal(user, null);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still exists: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })
// })


// describe('Delete all material from the deletedUser', () => {
//     const userAId = 'a3bb23d5-84ad-40e9-84c9-1065fac0d255';
//     const userBId = '9f381a8d-4ced-4598-9425-c6754047433c';
//     const userCId = 'aae2b14a-0d2f-4755-9874-d99a9387ec16';
//     const userDId = '7608fb16-6806-409a-bd28-3ab364c029fb';
//     let userToDelete;
//     let blogPost1;//delete comment // delete reply 
//     let blogPost2;//delete post
//     let blogPost3;// delete reply like
//     let blogPost4; //delete comment like // delete the post like 
//     let blogPost5; // delete post
//     let userA; // userA is following userToDelete, delete the userToDelete as a following on userA's account
//     let userB; ///userB is following userToDelete, delete the userToDelete as a following on userB's account
//     let userC; ///userC is a follower of userToDelete, delete userToDelete from userC's following array
//     let userD; // userD is a follower of userToDelete, delete userToDelete from userD's following array

//     before(done => {
//         userToDelete = new User({ _id: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c' })
//         userToDelete.save()
//             .then(() => { done() });
//     });

//     before(done => {
//         userA = new User(
//             {
//                 _id: userAId,
//                 followers:
//                     [
//                         {
//                             userId: userToDeleteId
//                         },
//                     ]
//             }
//         )
//         userA.save()
//             .then(() => { done() });
//     })

//     before(done => {
//         userB = new User(
//             {
//                 _id: userBId,
//                 followers:
//                     [
//                         {
//                             userId: userToDeleteId
//                         },
//                         {
//                             userId: 'df5b8625-2aae-4a35-b7ac-78de239dab46'
//                         }
//                     ],
//                 activities:
//                 {
//                     following:
//                         [
//                             {
//                                 userId: userToDeleteId
//                             },
//                             {
//                                 userId: 'df5b8625-2aae-4a35-b7ac-78de239dab46'
//                             }
//                         ]
//                 }
//             })
//         userB.save()
//             .then(() => { done() });
//     })
//     before(done => {
//         userC = new User(
//             {
//                 _id: userCId,
//                 activities:
//                 {
//                     following:
//                         [
//                             {
//                                 userId: userToDeleteId
//                             }
//                         ]
//                 }
//             }

//         )
//         userC.save()
//             .then(() => { done() });
//     })
//     before(done => {
//         userD = new User(
//             {
//                 _id: userDId,
//                 followers:
//                     [
//                         {
//                             userId: userToDeleteId
//                         },
//                         {
//                             userId: 'bfc449bc-5f4b-4bcf-a9bb-90bcbd174f00'
//                         }
//                     ],
//                 activities:
//                 {
//                     following:
//                         [
//                             {
//                                 userId: userToDeleteId
//                             },
//                             {
//                                 userId: 'ab2c19d9-3561-43d2-a4f6-e529b7ac9dfe'
//                             }
//                         ]
//                 }
//             }
//         )
//         userD.save()
//             .then(() => { done() });
//     })

//     before(done => {
//         // the first comment will be deleted 
//         blogPost1 = new BlogPost({
//             _id: '228f1140-f2e6-42a3-a152-dde27ac17445',
//             comments:
//                 [
//                     {
//                         commentId: 'b6f9534e-fdbc-44b9-be4a-f7bc3d545dbf',
//                         userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
//                     },
//                     {
//                         commentId: '8603af61-93d7-4a0d-8a1a-9428959dc6f4',
//                         userId: 'fba7cdea-b782-41f5-9fb3-e1964ac7a3c1',
//                         replies:
//                             // delete the replies
//                             [
//                                 {
//                                     replyId: '68a56a09-ec6f-45c9-a162-a01d02d8f7d7',
//                                     userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
//                                 },
//                                 {
//                                     replyId: '86c7258b-ce3b-4e10-81b9-b1d2bf0dae69',
//                                     userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
//                                 }
//                             ]
//                     }
//                 ]
//         })
//         blogPost1.save()
//             .then(() => { done() })
//     })

//     before(done => {
//         // the whole post will be deleted 
//         blogPost2 = new BlogPost(
//             {
//                 _id: '32f6243e-c851-40b3-998e-6af80e070e78',
//                 authorId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c',
//                 comments: []
//             }
//         )
//         blogPost2.save()
//             .then(() => { done() })
//     })

//     before(done => {
//         // delete all of the reply likes 
//         blogPost3 = new BlogPost({
//             _id: '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76',
//             comments:
//                 [
//                     {
//                         commentId: '6efc5d02-af8a-46cd-a837-438986cf4098',
//                         userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28'
//                     },
//                     {
//                         commentId: '2c305eed-c5ea-4a23-9ad3-03d501a2aec6',
//                         replies:
//                             [
//                                 {
//                                     replyId: 'dc078f7f-faaa-4acf-a2c0-2b669cbe4ec4',
//                                     userId: 'abebb8b2-093f-494b-bc61-f5b44995abb7',

//                                     userIdsOfLikes:
//                                         [
//                                             // delete this like
//                                             {
//                                                 userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
//                                             },
//                                             {
//                                                 userId: '6112d39e-2f04-4312-b5fa-72138adce6aa'
//                                             }
//                                         ]
//                                 },
//                                 {
//                                     replyId: '6bad8fb7-e8f5-40d2-a367-edfbb1e320a1',
//                                     userId: 'f6bce787-aaf2-4460-97be-4466fa0dc571'
//                                 }
//                             ],
//                         userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28'
//                     },
//                     {
//                         commentId: '2a22bcab-7043-4d2b-bd84-9565bba6099d',
//                         userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28'
//                     }
//                 ]
//         })
//         blogPost3.save()
//             .then(() => { done() })
//     });

//     before(done => {
//         blogPost4 = new BlogPost({
//             _id: '3de32081-0850-42d4-863a-de86c3d4bc31',
//             // delete this like
//             userIdsOfLikes: [{ userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c' }],
//             comments:
//                 [
//                     {
//                         commentId: '17e467e2-afaf-44a4-b86a-dac1dfd2e4d6',
//                         userId: '97c1ba42-4483-475b-9de2-0db6b936fcc9',
//                         userIdsOfLikes:
//                             // delete this like
//                             [
//                                 {
//                                     userId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c'
//                                 },
//                                 {
//                                     userId: '6112d39e-2f04-4312-b5fa-72138adce6aa'
//                                 }
//                             ]
//                     },
//                     {
//                         commentId: '1bad6510-89d3-464a-af0d-2eed1b2c44f6',
//                         replies:
//                             [
//                                 {
//                                     replyId: '5bc41431-4c47-46d5-9b8f-3c41eaf2220e',
//                                     userId: '8c3c10ce-5432-43b5-bbf3-966859143fc9',
//                                 },
//                                 {
//                                     replyId: '38fb0e9d-d2a0-42ab-b1df-cb6a14a2a3bf',
//                                     userId: '38fb0e9d-d2a0-42ab-b1df-cb6a14a2a3bf'
//                                 }
//                             ],
//                         userId: 'abb167b8-f3b8-4eab-91be-3b6a17cc4ccd'
//                     },
//                     {
//                         commentId: '2a22bcab-7043-4d2b-bd84-9565bba6099d',
//                         userId: 'bd82df82-c39a-45b5-a5a3-4b7707670b28'
//                     }
//                 ]
//         });
//         blogPost4.save()
//             .then(() => { done() })
//     })

//     before(done => {
//         // delete this post
//         blogPost5 = new BlogPost(
//             {
//                 _id: '2c7ea4fb-960a-47b9-bfa5-2d756cfbc4b0',
//                 authorId: 'd912e3db-d8ff-4a7f-aba7-6433170ca10c',
//                 comments: []
//             }
//         );
//         blogPost5.save()
//             .then(() => { done() })
//     });

//     before(done => {
//         BlogPost.bulkWrite(
//             [
//                 {
//                     // delete the posts
//                     deleteMany: {
//                         'filter': { authorId: userToDeleteId }
//                     }
//                 },
//                 {
//                     // delete reply likes
//                     updateMany: {
//                         'filter': {},
//                         'update':
//                         {
//                             $pull: {
//                                 'comments.$[comment].replies.$[reply].userIdsOfLikes': { userId: userToDeleteId }
//                             }
//                         },
//                         'arrayFilters': [{ 'comment.commentId': { $exists: true } }, { 'reply.replyId': { $exists: true } }]
//                     }
//                 },
//                 {
//                     // delete the comment likes
//                     updateMany: {
//                         'filter': {},
//                         'update':
//                         {
//                             $pull: {
//                                 'comments.$[comment].userIdsOfLikes': { userId: userToDeleteId }
//                             }
//                         },
//                         'arrayFilters': [{ 'comment.commentId': { $exists: true } }]
//                     }
//                 },
//                 {
//                     // delete the replies
//                     updateMany: {
//                         'filter': {},
//                         'update':
//                         {
//                             $pull: {
//                                 'comments.$[comment].replies': { userId: userToDeleteId }
//                             }
//                         },
//                         'arrayFilters': [{ 'comment.commentId': { $exists: true } }]
//                     }
//                 },
//                 {
//                     // delete the comments 
//                     updateMany: {
//                         'filter': {},
//                         'update':
//                         {
//                             $pull: {
//                                 'comments': { userId: userToDeleteId }
//                             }
//                         }
//                     }
//                 }
//             ]
//         )
//             .then(() => {
//                 done();
//             })
//             .catch(error => {
//                 if (error) {
//                     console.error('An error has occurred in deleting all material on feed that is by the deleted user: ', error);
//                 };
//             })
//     })

//     before(done => {
//         const userToDeleteFollowers = [userAId, userBId, userDId];
//         const userToDeleteFollowing = [userBId, userCId, userDId];
//         User.bulkWrite(
//             [
//                 {
//                     // delete the user from users following
//                     updateMany: {
//                         'filter': { _id: { $in: userToDeleteFollowing } },
//                         'update':
//                         {
//                             $pull: {
//                                 'activities.following': { userId: userToDeleteId }
//                             }
//                         }
//                     }
//                 },
//                 {
//                     // delete the user from users following
//                     updateMany: {
//                         'filter': { _id: { $in: userToDeleteFollowers } },
//                         'update':
//                         {
//                             $pull: {
//                                 'followers': { userId: userToDeleteId }
//                             }
//                         }
//                     }
//                 },
//                 {
//                     deleteOne: {
//                         'filter': { _id: userToDeleteId }
//                     }
//                 }
//             ]
//         ).then(() => {
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('An error has occurred in inserting dummy data into the collection of user into the DB: ', error);
//             };
//             done();
//         })
//     })

//     it('all reply likes were deleted', done => {
//         BlogPost.findOne(({ _id: '3e4eaf94-ef59-4e7b-a7d2-e7f0b6115e76' })).then(post => {
//             const commentReplyLikedDeleted = post.comments.find(({ commentId }) => commentId === '2c305eed-c5ea-4a23-9ad3-03d501a2aec6');
//             const replyLikedDeleted = commentReplyLikedDeleted.replies.find(({ replyId }) => replyId === 'dc078f7f-faaa-4acf-a2c0-2b669cbe4ec4');
//             const wasReplyLikeDeleted = !replyLikedDeleted.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId)

//             assert.equal(wasReplyLikeDeleted, true)
//             done();
//         })
//             .catch(error => {
//                 if (error) {
//                     console.error('Reply like by deleted user is still present: ', error);
//                     assert.fail()
//                 };
//                 done()
//             })
//     });

//     it('all comment likes were deleted', done => {
//         BlogPost.findOne({ _id: '3de32081-0850-42d4-863a-de86c3d4bc31' }).then(blogPost => {
//             const commentLiked = blogPost.comments.find(({ commentId }) => commentId === '17e467e2-afaf-44a4-b86a-dac1dfd2e4d6')
//             const isCommentNotLiked = !commentLiked.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId)
//             assert.equal(isCommentNotLiked, true)
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Comment like was not deleted: ', error)
//                 assert.fail()
//             };
//             done();
//         })
//     });

//     it('all post likes were deleted', done => {
//         BlogPost.findOne({ _id: '3de32081-0850-42d4-863a-de86c3d4bc31' }).then(post => {
//             const isPostNotLiked = !post.userIdsOfLikes.find(({ userId }) => userId === userToDeleteId);
//             assert.equal(isPostNotLiked, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Post like was not deleted: ', error);
//                 assert.fail();
//             };
//             done();
//         })
//     })

//     it('all comments were deleted', done => {
//         BlogPost.findOne({ _id: '228f1140-f2e6-42a3-a152-dde27ac17445' }).then(blogPost => {
//             const wasCommentDeleted = !blogPost.comments.find(({ userId }) => userId === userToDeleteId)
//             assert.equal(wasCommentDeleted, true)
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('An error has occurred in deleting comment and reply by deleted user: ', error)
//                 assert.fail('An error has occurred')
//             }
//             done();
//         })
//     })

//     it('all replies were deleted', done => {
//         BlogPost.findOne(({ _id: '228f1140-f2e6-42a3-a152-dde27ac17445' }))
//             .then(blogPost => {
//                 const targetComment = blogPost.comments.find(({ commentId }) => commentId === '8603af61-93d7-4a0d-8a1a-9428959dc6f4')
//                 const repliesByDeletedUser = targetComment.replies.filter(({ userId }) => userId === userToDeleteId);
//                 assert.equal(repliesByDeletedUser.length, 0)
//                 done();
//             }).catch(error => {
//                 if (error) {
//                     console.error('Replies were not deleted from post: ', error)
//                     assert.fail()
//                 }
//                 done();
//             })
//     });

//     it('All posts are deleted from deleted user.', done => {
//         BlogPost.find({ authorId: userToDeleteId })
//             .then(posts => {
//                 assert.equal(posts.length, 0);
//                 done();
//             }).catch(error => {
//                 if (error) {
//                     console.error('Fail to delete post made by the target user: ', error)
//                     assert.fail();
//                 };
//                 done();
//             })
//     });

//     it('checking if deleted user is a follower of userA', done => {
//         User.findOne({ _id: userAId }, { followers: 1 }).then(user => {
//             console.log('userA: ', user)
//             const isDeletedUserNotAFollower = !user.followers.find(({ userId }) => userId === userToDeleteId);
//             assert.equal(isDeletedUserNotAFollower, true);
//             done()
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still a follower of userA: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })

//     it('checking if deleted user is a follower of userB', done => {
//         User.findOne({ _id: userBId }, { followers: 1 }).then(user => {
//             const isNotPresentInUserBFollowers = !user.followers.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserBFollowers, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still a follower of userB: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })

//     it('checking if deleted user is being followed by userB', done => {
//         User.findOne({ _id: userBId }, { followers: 1, activities: 1 }).then(user => {
//             const isNotPresentInUserBFollowing = !user.activities.following.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserBFollowing, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still being followed by userB: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })

//     it('checking if deleted user is being followed by userC', () => {
//         User.findOne({ _id: userCId }, { followers: 1, activities: 1 }).then(user => {
//             const isNotPresentInUserCFollowing = !user.activities.following.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserCFollowing, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still being followed by userC: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })


//     it('checking if deleted user is a follower of userD', done => {
//         User.findOne({ _id: userDId }, { followers: 1 }).then(user => {
//             const isNotPresentInUserDFollowers = !user.followers.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserDFollowers, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still a follower of userD: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })

//     it('checking if deleted user is being followed by userD', done => {
//         User.findOne({ _id: userDId }, { followers: 1, activities: 1 }).then(user => {
//             const isNotPresentInUserDFollowing = !user.activities.following.map(({ userId }) => userId).includes(userToDeleteId)
//             assert.equal(isNotPresentInUserDFollowing, true);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still being followed by userD: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     });

//     it('Checking if deleted user exist.', done => {
//         User.findOne({ _id: userToDeleteId }).then(user => {
//             assert.equal(user, null);
//             done();
//         }).catch(error => {
//             if (error) {
//                 console.error('Deleted user is still exists: ', error);
//                 assert.fail();
//             }
//             done()
//         })
//     })
// })

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
            _id: { $in: usersToDelete }
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


