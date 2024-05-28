
// isMobileDevice.js
const isMobileDevice = (userAgent) => {

    // 다양한 모바일 기기를 포함한 정규식
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    return isMobile;
};

// DOCPORTAL에 값을 할당하는 함수
const getDeviceType = () => {
    if (typeof window.DOCPORTAL === 'undefined') {
        window.DOCPORTAL = {}; // DOCPORTAL 객체가 정의되지 않은 경우 초기화
    }

    window.DOCPORTAL.deviceType = isMobileDevice() ? "M" : "W";
};

module.exports = { isMobileDevice, getDeviceType }