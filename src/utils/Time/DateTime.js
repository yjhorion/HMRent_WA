// 현재 날짜와 시간을 가져오는 함수
function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');

    return {
        year,
        month,
        day,
        hour,
        minute,
        second
    };
}

module.exports = getCurrentDateTime;
