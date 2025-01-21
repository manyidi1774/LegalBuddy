const API_BASE_URL = 'http://localhost:3000';
class ChatManager {
    constructor() {
        this.setupThemeToggle();
        this.setupSidebar();
        this.setupEventListeners();
        this.loadChatHistory(); // We'll define this method now
    }

    // Add this method
    async loadChatHistory() {
        try {
            console.log('Fetching chat history...'); // Debug log
            const response = await fetch(`${API_BASE_URL}/api/chat-history`);
            console.log('Response status:', response.status); // Debug log
            const messages = await response.json();
            console.log('Received messages:', messages); // Debug log

            const chatWindow = document.getElementById('chat-window');
            if (chatWindow) {
                chatWindow.innerHTML = '';
                messages.forEach(msg => {
                    this.addMessage(msg.content, msg.isUser);
                });
            }
        } catch (error) {
            console.error('Detailed error:', error); // Debug log
        }
    }

    // Your existing methods...
    setupThemeToggle() {
        const root = document.documentElement;
        const themeToggle = document.getElementById('theme-switch');

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = root.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                root.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                this.savePreferences(newTheme, document.getElementById('language').value);
            });
        }

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        root.setAttribute('data-theme', savedTheme);
    }

    setupSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('chat-sidebar');

        if (sidebarToggle && sidebar) {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);

            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    }

    setupEventListeners() {
        const sendButton = document.getElementById('send-btn');
        const userInput = document.getElementById('user-input');
        const newChatBtn = document.getElementById('new-chat');

        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }

        if (userInput) {
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.createNewChat());
        }
    }

    addMessage(message, isUser = false) {
        const chatWindow = document.getElementById('chat-window');
        if (!chatWindow) {
            console.error('Chat window element not found');
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user' : 'bot'}`;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="avatar">
                    <img src="https://placehold.co/40x40/8B7355/FFFFFF?text=${isUser ? 'U' : 'LB'}" 
                     alt="${isUser ? 'User' : 'Bot'}">>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="name">${isUser ? 'You' : 'LegalBuddy'}</span>
                    <span class="timestamp">${timestamp}</span>
                </div>
                ${message}
            </div>
        `;

        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async sendMessage() {
        const userInput = document.getElementById('user-input');
        if (!userInput) return;

        const message = userInput.value.trim();
        if (message) {
            try {
                console.log('Sending message...'); // Debug log
                this.addMessage(message, true);
                userInput.value = '';

                // Fix: Correct API endpoint URL
                const response = await fetch(`${API_BASE_URL}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message })
                });

                console.log('Response status:', response.status); // Debug log

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Received response:', data); // Debug log
                this.addMessage(data.response, false);

            } catch (error) {
                console.error('Detailed error:', error);
                this.addMessage('Sorry, there was an error processing your request.', false);
            }
        }
    }
}

function createNewChat() {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.innerHTML = `
                <div class="chat-message bot">
                    <div class="avatar">
                            <img src="https://placehold.co/40x40/8B7355/FFFFFF?text=LB" alt="Bot">
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="name">LegalBuddy</span>
                            <span class="timestamp">Just now</span>
                        </div>
                        Hi! How can I help you with your legal questions today?
                    </div>
                </div>
            `;
    }
}
// Close sidebar on mobile
if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('chat-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}


async function savePreferences(theme, language) {
    try {
        await fetch(`${API_BASE_URL}/api/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme, language })
        });
    } catch (error) {
        console.error('Error saving preferences:', error);
    }

}



// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
});