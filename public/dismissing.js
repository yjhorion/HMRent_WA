/* 더블클릭하면 예약 취소하고 예약/취소 페이지를 다시 로딩하는 스크립트 */

function sendRequest(AssetNo) {
    const requestBody = {
        // 요청 본문에 포함될 데이터
        assetNo: AssetNo,
        // 필요한 경우 다른 데이터 추가 가능
    };

    fetch(`/reservation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // 요청 본문의 데이터 형식 지정
        },
        body: JSON.stringify(requestBody), // 요청 본문 데이터를 JSON 형식으로 변환하여 전송
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // 요청에 대한 응답을 처리하는 로직 추가
        console.log(data);

        // 현재 페이지를 새로 고침
        window.location.reload();
    })
    .catch(error => {
        console.error('There was a problem with your fetch operation:', error);
    });
}
