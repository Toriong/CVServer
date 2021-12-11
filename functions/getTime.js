const getTime = () => {
    const miliSecsInAMonth = 2_628_000_000;
    let today = new Date();
    let month = (today.getMonth() + 1);
    if (month.toString().length === 1) {
        month = `0${month}`;
    }
    let year = today.getFullYear();
    let day = today.getDate();
    if (day.toString().length === 1) {
        day = `0${day}`;
    }
    let date = month + "/" + day + "/" + year;
    let minutes = today.getMinutes()
    if (minutes.toString().length === 1) {
        minutes = `0${minutes}`;
    }
    const hours = today.getHours();
    let seconds = today.getSeconds();
    if (seconds.toString().length === 1) {
        seconds = `0${seconds}`;
    }
    const time = hours + ":" + minutes;
    const miliSeconds = Date.now();
    const miliSecsInAMin = 60_000;
    const firstDayOfYear = new Date(today.getFullYear(), 0, 0);
    const lastDay = new Date(today.getFullYear(), 11, 31);
    const msOfCurrentYear = (lastDay - firstDayOfYear) + ((lastDay.getTimezoneOffset() - firstDayOfYear.getTimezoneOffset()) * miliSecsInAMin);

    return {
        date,
        time,
        miliSeconds,
        msOfCurrentYear
    };
};

// MS = miliSeconds
const computeTimeElapsed = (timeElapsedInMS, msInAYear) => {
    const miliSecsInAMin = 60_000;
    const miliSecsInAHour = 3_600_000;
    const miliSecsInADay = 86_400_000;
    const miliSecsInAMonth = 2_628_000_000;
    const minutes = Math.floor(timeElapsedInMS / miliSecsInAMin);
    const hours = Math.floor(timeElapsedInMS / miliSecsInAHour);
    const days = Math.floor(timeElapsedInMS / miliSecsInADay);
    const months = Math.floor(timeElapsedInMS / miliSecsInAMonth);
    const years = Math.floor(timeElapsedInMS / msInAYear);

    return { minutes, hours, days, months, years };
};

const getTimeElapsedText = (minutes, hours, days, months, years) => {
    let text;
    if (minutes < 1 && minutes >= 0) {
        text = "less than a minute ago"
    } else if (minutes >= 1 && minutes < 60) {
        text = minutes === 1 ? "a minute ago" : `${minutes} minutes ago`;
    } else if (minutes >= 60 && hours < 24) {
        text = hours === 1 ? "about an hour ago" : `about ${hours} hours ago`;
    } else if (days >= 1 && days < 30) {
        text = days === 1 ? "about a day ago" : `about ${days} days ago`;
    } else if (days >= 30 && (months < 12 && months >= 1)) {
        text = months === 1 ? "about a month ago" : `about ${months} months ago`;
    } else if (years >= 1) {
        text = years === 1 ? "about a year ago" : `about ${years} years ago`;
    }

    return text;
}

module.exports = {
    getTime,
    computeTimeElapsed,
    getTimeElapsedText
};
