document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevents the form from submitting and refreshing the page

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Log the username and password to the console (for testing purposes)
    console.log('Username:', username);
    console.log('Password:', password);

    // You can extend this later to handle actual login authentication
});import Link from 'next/link';
// Correct usage
<Link href="/login">
  <a>Login</a>
</Link>