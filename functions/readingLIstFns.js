
const getReadingListsAndPostsPics = (_readingLists, posts, users, _userId) => {
    let readingLists = _readingLists;
    const listNames = Object.keys(readingLists);
    let postsWithIntroPics = [];
    const _postIds = posts.map(({ _id }) => _id);
    // deleting all posts that no longer exist
    listNames.forEach(listName => {
        const { list, previousNames } = readingLists[listName];
        let _list = list.filter(({ postId }) => _postIds.includes(postId));
        // delete the post if the author of the post blocked the user that saved their post
        _list = _list.filter(({ postId }) => {
            const targetPost = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postId))
            const author = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(targetPost.authorId));
            const blockedUserIds = author?.blockedUsers?.length ? author.blockedUser.map(({ userId }) => userId) : [];
            return !blockedUserIds.includes(_userId);
        })
        // GOAL: get the following info: subtitle, title, intro pic, likes, comments, and date of publication
        _list = _list.map(post => {
            const targetPost = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(post.postId));
            const { username: authorUsername } = users.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(targetPost.authorId))
            const { title, subtitle, imgUrl, comments, userIdsOfLikes, publicationDate, _id } = targetPost;
            return { ...post, title, subtitle, imgUrl, comments, userIdsOfLikes, publicationDate, authorUsername, _id };
        })
        readingLists = {
            ...readingLists,
            [listName]: previousNames ? { ...readingLists[listName], didNameChanged: true, list: _list } : { ...readingLists[listName], list: _list }
        };
        // DO I NEED TO DO THIS?
        // get all of the posts that has intro pics
        _list.forEach(({ postId, isIntroPicPresent }) => {
            if (isIntroPicPresent) {
                const _post = posts.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postId))
                const { _id, imgUrl } = _post;
                const isPostPresent = !!postsWithIntroPics.find(post => post?._id === _id);
                !isPostPresent && postsWithIntroPics.push({ _id, imgUrl });
            };
        })
    });

    return { postsWithIntroPics, readingLists };
};


module.exports = {
    getReadingListsAndPostsPics
}

