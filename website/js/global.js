function toggleMenu(menu) {
    menu.classList.toggle('open');
}


const form = document.getElementById('goalsForm');
const messageElement = document.getElementById('message');

form.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission

    const name = document.getElementById('name').value;
    const email = document.getElementById('weight').value;

    // Save data to localStorage
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);

    messageElement.textContent = 'Data saved to local storage!';
    console.log('Data saved:', { name, email });
});

// Optional: Load data on page load
window.onload = function() {
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');

    if (savedName) {
        document.getElementById('name').value = savedName;
    }
    if (savedEmail) {
        document.getElementById('email').value = savedEmail;
    }
};