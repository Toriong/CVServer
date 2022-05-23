
const getPostTags = (selectedTags, tags) => selectedTags.map(tag => {
    const { isNew, _id: postTagId } = tag;
    if (!isNew) {
        const _tag = tags.find(({ _id }) => JSON.stringify(_id) === JSON.stringify(postTagId));

        return _tag;
    };

    return tag;
});

const getTextPreview = text => {
    let textPreview = text.split(' ').slice(0, 45);
    textPreview.splice(44, 1, `${textPreview[44]}...`);
    textPreview = textPreview.join(' ');

    return textPreview
};

module.exports = {
    getPostTags,
    getTextPreview
};
