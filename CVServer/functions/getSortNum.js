

const getSortNum = (itemA, itemB) => {
    if (itemA > itemB) return 1;
    if (itemA < itemB) return -1;
    return 0
};

module.exports = {
    getSortNum
}
