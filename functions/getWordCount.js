
const getWordCount = str => {
    if ((str === null) || (str === '')) {
        return 0;
    } else {
        str = str.toString();
        const htmlRemovedStr = str.replace(/(<([^>]+)>)/ig, '');
        const whiteSpaceRemovedStr = htmlRemovedStr.replace(/&nbsp;/g, ' ');
        const bodyWords = whiteSpaceRemovedStr.split(" ").filter(word => word !== "");
        return bodyWords.length;
    }
};

module.exports = {
    getWordCount
};