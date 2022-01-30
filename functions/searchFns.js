

const getLocaleCompare = (valA, valB, searchTypes) => {
    const { isTagSearch, isStoriesSearch } = searchTypes;
    const _valA = isTagSearch ? valA.topic : isStoriesSearch ? valA.title : valA.username;
    const _valB = isTagSearch ? valB.topic : isStoriesSearch ? valB.title : valB.username;
    return _valA.localeCompare(_valB)
}



const sortResults = (searchResults, input, searchType) => {
    const isTagSearch = searchType === 'tags';
    const isStoriesSearch = searchType === 'stories';
    const searchTypes = { isTagSearch: isTagSearch, isStoriesSearch: isStoriesSearch };
    let resultsStartWithInput = [];
    let resultsIncludesInput = [];
    searchResults.forEach(result => {
        const { topic, username, title } = result;
        const resultType = isTagSearch ? topic : isStoriesSearch ? title : username;
        if (resultType.toUpperCase().startsWith(input.toUpperCase())) {
            resultsStartWithInput.push(result);
        } else {
            resultsIncludesInput.push(result);
        }
    });

    if (resultsStartWithInput.length > 1) {
        resultsStartWithInput = resultsStartWithInput.sort((valA, valB) => getLocaleCompare(valA, valB, searchTypes));
    }

    if (resultsIncludesInput.length > 1) {
        resultsIncludesInput = resultsIncludesInput.sort((valA, valB) => getLocaleCompare(valA, valB, searchTypes));
    }

    return [...resultsStartWithInput, ...resultsIncludesInput]
};


module.exports = {
    sortResults
}