/**
 * Generates the HTML content for a Grafana-like login decoy page.
 * 
 * @param escapedUrl - The properly escaped tracking URL to be embedded in the page.
 * @returns The full HTML string for the decoy page.
 */
export const generateGrafanaDecoyHtml = (escapedUrl: string): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Grafana</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f7f8fa;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: #333;
        }
        
        .login-container {
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            width: 340px;
            padding: 30px;
            text-align: center;
        }
        
        .logo {
            margin-bottom: 30px;
        }
        
        .logo img {
            height: 40px;
        }
        
        h1 {
            font-size: 24px;
            font-weight: 300;
            margin-bottom: 30px;
        }
        
        .input-group {
            margin-bottom: 20px;
            text-align: left;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            font-size: 14px;
        }
        
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 3px;
            box-sizing: border-box;
            font-size: 14px;
        }
        
        button {
            width: 100%;
            padding: 10px;
            background-color: #299c46; /* Green button */
            color: white;
            border: none;
            border-radius: 3px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-bottom: 20px;
        }
        
        button:hover {
            background-color: #268c40; /* Darker green on hover */
        }
        
        .forgot-password {
            font-size: 13px;
            color: #579;
            text-decoration: none;
        }
        
        .forgot-password:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <img src="https://grafana.com/static/assets/img/grafana_logo.svg" alt="Grafana Logo">
        </div>
        <h1>Welcome to Grafana</h1>
        
        <div class="input-group">
            <label for="username">Email or username</label>
            <input type="text" id="username" placeholder="Email or username" required>
        </div>
        
        <div class="input-group">
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="password" required>
        </div>
        
        <button type="button" onclick="trackLoginAttempt()">Log in</button> <!-- Added type="button" and onclick -->
        
        <a href="#" class="forgot-password">Forgot your password?</a>
    </div>

  <script>
    function trackLoginAttempt() {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      let url = '${escapedUrl}';
      // Optionally include username/password in tracking (consider security implications)
      // url += '&username=' + encodeURIComponent(username);
      // url += '&password=' + encodeURIComponent(password); // Be very careful with logging passwords!
      
      // Send the tracking request (fire-and-forget)
      fetch(url, { method: 'GET', mode: 'no-cors' })
        .catch(err => console.error('Tracking Error:', err));

      // Simulate login failure or redirect after tracking
      alert('Login failed. Invalid credentials.'); // Or redirect: window.location.href = '/login-failed';
    }
  </script>
</body>
</html>`;
};