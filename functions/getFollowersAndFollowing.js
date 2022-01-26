

const getFollowersAndFollowing = (_user, willGetFollowers = true) => {
    const { followers, activities } = _user;
    let user;
    if (followers?.length && willGetFollowers) {
        user = { followers };
    }
    if (activities?.following?.length) {
        user = user ? { ...user, following: activities.following } : { following: activities.following };
    }

    return user;
}

module.exports = {
    getFollowersAndFollowing
}