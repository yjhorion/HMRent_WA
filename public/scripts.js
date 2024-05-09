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
