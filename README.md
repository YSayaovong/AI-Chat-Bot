AI Chat Bot
A simple, front-end AI chatbot interface built with HTML, CSS, and JavaScript. This project sends user input to a backend API and displays the AI’s responses in a clean, chat-style UI with support for formatted text and optional images.

Features
Responsive Chat UI – Alternating message backgrounds for user and bot.

Backend API Integration – Sends user messages to the specified AI API endpoint.

Text Formatting Support – Handles headings, bold text, bullet points, and numbered lists.

Image Rendering – Displays images returned by the API alongside text.

Keyboard & Button Input – Send messages with Enter key or a send button.

Technologies Used
HTML5 for structure

CSS3 for chat styling and layout

JavaScript (Vanilla) for interactivity and API communication

How It Works
User enters a message in the input field.

JavaScript sends the message via a POST request to the backend API.

The API responds with a formatted reply and optional image URL.

The chat UI updates to display the bot’s response.

Setup & Usage
Clone the repository:

bash
Copy
Edit
git clone https://github.com/yourusername/ai-chat-bot.git
cd ai-chat-bot
Open the HTML file in a browser.

Replace the API endpoint and uid in the JavaScript section with your own credentials if necessary.

Customization
Styling: Modify the <style> section to change colors, fonts, and layout.

API Endpoint: Update the fetch() URL and headers to connect to your preferred AI backend.

License
This project is licensed under the MIT License – feel free to use and modify it for your own purposes.
