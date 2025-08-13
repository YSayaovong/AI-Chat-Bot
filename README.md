# AI Chat Bot

A simple, front-end AI chatbot interface built with HTML, CSS, and JavaScript. This project sends user input to a backend API and displays the AI’s responses in a clean, chat-style UI with support for formatted text and optional images.

## Features
- **Responsive Chat UI** – Alternating message backgrounds for user and bot.
- **Backend API Integration** – Sends user messages to the specified AI API endpoint.
- **Text Formatting Support** – Handles headings, bold text, bullet points, and numbered lists.
- **Image Rendering** – Displays images returned by the API alongside text.
- **Keyboard & Button Input** – Send messages with Enter key or a send button.

## Technologies Used
- **HTML5** for structure
- **CSS3** for chat styling and layout
- **JavaScript (Vanilla)** for interactivity and API communication

## How It Works
1. User enters a message in the input field.
2. JavaScript sends the message via a POST request to the backend API.
3. The API responds with a formatted reply and optional image URL.
4. The chat UI updates to display the bot’s response.

## Setup & Usage
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-chat-bot.git
   cd ai-chat-bot
2. Open the HTML file in a browser.
3. Replace the API endpoint and uid in the JavaScript section with your own credentials if necessary.

### Customization
Styling: Modify the <style> section to change colors, fonts, and layout.

API Endpoint: Update the fetch() URL and headers to connect to your preferred AI backend.

License
This project is licensed under the MIT License – feel free to use and modify it for your own purposes.
