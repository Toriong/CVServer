
const insertNewLike = (_likedOn, likes, newLike) => {
    let _likes = likes;
    const doesDateExist = _likes && _likes.map(({ likedOn }) => likedOn).includes(_likedOn);
    if (doesDateExist) {
        _likes = _likes.map(like => {
            const { likedOn, activities: _activities } = like;
            if (likedOn === _likedOn) {
                return {
                    ...like,
                    activities: [..._activities, newLike]
                }
            };

            return like;
        })
    } else {
        const dayOfLike = { likedOn: _likedOn, activities: [newLike], isLikes: true }
        _likes = _likes ? [..._likes, dayOfLike] : [dayOfLike]
    };

    return _likes;
};

module.exports = {
    insertNewLike
}
