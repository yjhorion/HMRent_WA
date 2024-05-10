// document.addEventListener('DOMContentLoaded', () => {
//     const inputBox = document.getElementById('inputBox');

//     inputBox.addEventListener('keyup', async (event) => {
//         if (event.key === 'Enter') {
//             const inputValue = inputBox.value.trim();
//             if (inputValue !== '') {
//                 try {
//                     const response = await fetch('/INQC', {
//                         method: 'POST',
//                         headers: {
//                             'Content-Type': 'application/json'
//                         },
//                         body: JSON.stringify({ data: inputValue })
//                     });
//                     if (response.ok) {
//                         console.log('Data sent successfully!');
//                         inputBox.value = ''; // Clear input after sending
//                     } else {
//                         console.error('Failed to send data to the server.');
//                     }
//                 } catch (error) {
//                     console.error('Error:', error);
//                 }
//             }
//         }
//     });
// });

// document.addEventListener('DOMContentLoaded', () => {
//     const inputBox = document.getElementById('inputBox');

//     inputBox.addEventListener('keyup', async (event) => {
//         if (event.key === 'Enter') {
//             const inputValue = inputBox.value.trim();
//             if (inputValue !== '') {
//                 try {
//                     const response = await fetch(`/INQC?carNo=${inputValue}`, {
//                         method: 'GET',
//                     });
//                     if (response.ok) {
//                         console.log('Data sent successfully!');
//                         inputBox.value = ''; // Clear input after sending
//                     } else {
//                         console.error('Failed to send data to the server.');
//                     }
//                 } catch (error) {
//                     console.error('Error:', error);
//                 }
//             }
//         }
//     });
// });


document.addEventListener('DOMContentLoaded', () => {
    const inputBox = document.getElementById('inputBox');

    inputBox.addEventListener('keyup', async (event) => {
        if (event.key === 'Enter') {
            const inputValue = inputBox.value.trim();
            if (inputValue !== '') {
                try {
                    const response = await fetch(`/INQC?carNo=${inputValue}`, {
                        method: 'GET',
                    });
                    if (response.ok) {
                        console.log('Data sent successfully!');
                        inputBox.value = ''; // Clear input after sending
                        window.location.href = `/INQC?carNo=${inputValue}`; // Redirect to INQC page with search query
                    } else {
                        console.error('Failed to send data to the server.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        }
    });
});

const exeNoDivs = document.querySelectorAll('.carNo');
exeNoDivs.forEach(div => {
    div.addEventListener('click', function() {
        const carNo = this.innerText;
        sendRequest(carNo);
    });
});

function sendRequest(carNo) {
    // 클릭한 차량번호를 사용하여 HTTP 요청을 보내는 로직
    // fetch API등을  사용하여 백엔드에 요청 보낼 것
    fetch(`/editINQC/${carNo}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // 요청에 대한 응답을 처리하는 로직 추가
            console.log(data);

            //리다이렉트된 주소로 이동                 //comp에 맞게 수정필요
            const redirectUrl = `/editINQC?GUBUN=${data.GUBUN}&exeNo=${data.exeNo}&carNo=${data.carNo}&CliName=${data.CliName}&InReason=${data.InReason}`;
            window.location.href = redirectUrl
        })
        .catch(error => {
            console.error('There was a problem with your fetch operation:', error);
        });
}