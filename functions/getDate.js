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
    let hours = today.getHours();
    if (hours.toString().length === 1) {
        hours = `0${hours}`;
    }
    let seconds = today.getSeconds();
    if (seconds.toString().length === 1) {
        seconds = `0${seconds}`;
    }
    let time = hours + ":" + minutes + ":" + seconds;

    return {
        _date: date,
        _time: time
    };
}

module.exports = getTime