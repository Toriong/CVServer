const { convertToStandardTime } = require("./getTime");


const sortListNamesByCreation = list => {
    let _previousNames;
    list.forEach(name => {
        const { oldName, newName, timeOfChange } = name
        const { date: dateOfChange, time } = timeOfChange;
        const previousName = { oldName, newName, time: time };
        const isDatePresent = _previousNames && _previousNames.map(({ date }) => date).includes(dateOfChange);
        if (isDatePresent) {
            _previousNames = _previousNames.map(name => {
                const { date: _dateOfChange, previousNames } = name;
                if (_dateOfChange === dateOfChange) {
                    return {
                        ...name,
                        previousNames: [...previousNames, previousName]
                    }
                };

                return name
            })
        } else {
            const previousNameDefault = { date: dateOfChange, previousNames: [previousName] }
            _previousNames = _previousNames ? [..._previousNames, previousNameDefault] : [previousNameDefault]
        }

    });

    return _previousNames;
}

module.exports = {
    sortListNamesByCreation
}
