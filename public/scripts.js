document.addEventListener('DOMContentLoaded', () => {
    const inputBox = document.getElementById('inputBox');

    inputBox.addEventListener('keyup', async (event) => {
        if (event.key === 'Enter') {
            const inputValue = inputBox.value.trim();
            if (inputValue !== '') {
                try {
                    const response = await fetch('/INQC-carNo', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ data: inputValue })
                    });
                    if (response.ok) {
                        console.log('Data sent successfully!');
                        inputBox.value = ''; // Clear input after sending
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