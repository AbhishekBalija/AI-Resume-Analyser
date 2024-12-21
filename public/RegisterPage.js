const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

const signUpForm = document.querySelector('.sign-up form');
const signInForm = document.querySelector('.sign-in form');

// Helper function to show error messages
const showError = (message) => {
    alert(message);
    console.error('Error:', message);
};

// Helper function to validate email
const isValidEmail = (email) => {
    return email.includes('@') && email.includes('.');
};

signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = signUpForm.querySelector('input[placeholder="Name"]').value.trim();
    const email = signUpForm.querySelector('input[placeholder="Email"]').value.trim();
    const password = signUpForm.querySelector('input[placeholder="Password"]').value;

    // Client-side validation
    if (!name || !email || !password) {
        showError('All fields are required');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
            timeout: 10000 // 10 second timeout
        });

        let data;
        try {
            data = await response.json();
        } catch (error) {
            throw new Error('Invalid response from server');
        }
        
        if (response.ok && data.success) {
            window.location.href = data.redirectUrl;
        } else {
            showError(data.error || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Registration failed. Please check your connection and try again.');
    }
});

signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signInForm.querySelector('input[placeholder="Email"]').value.trim();
    const password = signInForm.querySelector('input[placeholder="Password"]').value;

    // Client-side validation
    if (!email || !password) {
        showError('All fields are required');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            timeout: 10000 // 10 second timeout
        });

        let data;
        try {
            data = await response.json();
        } catch (error) {
            throw new Error('Invalid response from server');
        }
        
        if (response.ok && data.success) {
            window.location.href = data.redirectUrl;
        } else {
            showError(data.error || 'Login failed. Please check your credentials.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please check your connection and try again.');
    }
});