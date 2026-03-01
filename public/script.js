const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const messagesWrapper = document.getElementById('messagesWrapper');
const micBtn = document.getElementById('micBtn');
const voiceToggleBtn = document.getElementById('voiceToggleBtn');

// Voice System State
let voiceEnabled = false;
let synthesis = window.speechSynthesis;
let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;

// Setup Voice Synthesis Toggle
voiceToggleBtn.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    voiceToggleBtn.classList.toggle('active', voiceEnabled);
    if (!voiceEnabled && synthesis) {
        synthesis.cancel();
    }
});

// Function to speak AI response
const speakText = (text) => {
    if (!voiceEnabled || !synthesis) return;

    // Strip markdown formatting simple regex
    let cleanText = text
        .replace(/[*_#`~]/g, "")
        .replace(/\[.*?\]\(.*?\)/g, "")
        .replace(/```[\s\S]*?```/g, "Code block omitted");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN'; // Use Hindi/English mixed voice for better pronunciation of Hinglish
    synthesis.speak(utterance);
};

// Setup Speech Recognition
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN'; // Default to Hindi to catch 'isme voise wala bhi add kro' properly

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        userInput.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            userInput.value = finalTranscript;
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        stopRecording();
    };

    recognition.onend = () => {
        stopRecording();
    };
}

const stopRecording = () => {
    isRecording = false;
    micBtn.classList.remove('recording');
    userInput.placeholder = "Message the AI...";
    if (recognition) recognition.stop();
};

micBtn.addEventListener('click', () => {
    if (!SpeechRecognition) {
        alert("Sorry, your browser doesn't support speech recognition.");
        return;
    }

    if (isRecording) {
        stopRecording();
    } else {
        userInput.value = '';
        recognition.start();
    }
});

// Scroll helper
const scrollToBottom = () => {
    messagesWrapper.scrollTo({
        top: messagesWrapper.scrollHeight,
        behavior: 'smooth'
    });
};

// Formatter to handle basic markdown
const formatMessage = (text) => {
    // Escape HTML first
    let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Newlines -> break tags outside of pre/code
    html = html.replace(/\n(?!<\/code>|<\/pre>)/g, '<br>');

    return html;
};

// Add user message to UI
const addUserMessage = (text) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    msgDiv.innerHTML = `
        <div class="avatar">👤</div>
        <div class="bubble">${formatMessage(text)}</div>
    `;
    messagesWrapper.appendChild(msgDiv);
    scrollToBottom();
};

// Add AI message to UI
const addAIMessage = (text) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message';
    msgDiv.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="bubble">${formatMessage(text)}</div>
    `;
    messagesWrapper.appendChild(msgDiv);
    scrollToBottom();
};

// Add typing indicator
const showTypingIndicator = () => {
    const id = 'typing-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai-message';
    msgDiv.id = id;
    msgDiv.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="bubble">
            <div class="typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
    `;
    messagesWrapper.appendChild(msgDiv);
    scrollToBottom();
    return id;
};

// Remove typing indicator
const removeTypingIndicator = (id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
};

// Handle form submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = userInput.value.trim();
    if (!message) return;

    // Clear input, disable button
    userInput.value = '';
    sendBtn.disabled = true;

    addUserMessage(message);
    const typingId = showTypingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        removeTypingIndicator(typingId);

        if (response.ok) {
            addAIMessage(data.text);
            speakText(data.text);
        } else {
            addAIMessage(`⚠️ Error: ${data.error || 'Something went wrong.'}`);
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        addAIMessage(`⚠️ Connection Error: Could not reach the server.`);
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
});

// Initial focus
userInput.focus();
