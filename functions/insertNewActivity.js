
const insertNewActivity = values => {
    const { dateOfActivity, newActivity, activities, dateField, activityType } = values;
    let _activities = activities
    const doesDateExist = _activities?.length && activities?.map(activity => activity[dateField])?.includes(dateOfActivity);
    if (doesDateExist) {
        _activities = activities.map(activity => {
            if (activity[dateField] === dateOfActivity) {
                return {
                    ...activity,
                    activities: [...activity.activities, newActivity]
                }
            };

            return activity;
        })
    } else {
        const dayOfActivity = { [dateField]: dateOfActivity, activities: [newActivity], [activityType]: true };
        _activities = _activities ? [..._activities, dayOfActivity] : [dayOfActivity];
    }

    return _activities;
}

module.exports = {
    insertNewActivity
}

