document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const inputField = document.querySelector('.input-area input');
    const sendBtn = document.querySelector('.send-btn');

    // Mock Chat Conversation Sequence
    const conversation = [
        {
            role: 'user',
            text: '지금 도쿄 시부야인데, 와이파이 빠르고 콘센트 있는 조용한 카페 있을까?',
            delay: 1500
        },
        {
            role: 'ai',
            text: '시부야에 계시군요! 🧑‍💻 지금 위치에서 도보 5분 거리에 있는 **"Streamer Coffee Company"**를 추천합니다. \n\n✅ 기가 와이파이 무료\n✅ 테이블당 콘센트 2개\n✅ 평점 4.8 / 조용한 분위기\n\n[구글 지도로 길찾기 (링크)]',
            delay: 2000
        },
        {
            role: 'user',
            text: '오 고마워! 메뉴판 보니까 영어 점원 있는지 물어보고 싶은데, 일본어로 어떻게 말해야 해?',
            delay: 3500
        },
        {
            role: 'ai',
            text: '이렇게 말씀해 보세요! 🗣️\n\n**"에-고오 하나세루 스타-후와 이마스카?"**\n(英語を話せるスタッフはいますか？)\n\n하단의 🔊 버튼을 누르시면 제가 대신 현지 발음으로 말해드릴게요!',
            delay: 1500
        }
    ];

    let currentMsgIndex = 0;

    // Typewriter effect function for automated messages
    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', role);
        msgDiv.style.opacity = '0'; // Start hidden for fadeIn animation

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = `
            <div class="bubble">${text.replace(/\n/g, '<br>')}</div>
            <span class="time">${timeStr}</span>
        `;

        chatBox.appendChild(msgDiv);

        // Trigger reflow & animation
        setTimeout(() => {
            msgDiv.style.opacity = '1';
            chatBox.scrollTop = chatBox.scrollHeight;
        }, 50);
    }

    // Play mock conversation
    function playNextMsg() {
        if (currentMsgIndex < conversation.length) {
            const msg = conversation[currentMsgIndex];
            setTimeout(() => {
                appendMessage(msg.role, msg.text);
                currentMsgIndex++;
                playNextMsg();
            }, msg.delay);
        } else {
            // Enable input after demo
            setTimeout(() => {
                inputField.removeAttribute('disabled');
                inputField.placeholder = "메시지를 입력해 보세요!";
            }, 1000);
        }
    }

    // Start Demo
    setTimeout(() => {
        playNextMsg();
    }, 1000);

    // Handle Manual Input (After demo ends)
    sendBtn.addEventListener('click', () => {
        handleUserInput();
    });

    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserInput();
        }
    });

    function handleUserInput() {
        const text = inputField.value.trim();
        if (text === '') return;

        appendMessage('user', text);
        inputField.value = '';
        inputField.setAttribute('disabled', 'true'); // Temp disable

        // Mock AI response
        setTimeout(() => {
            appendMessage('ai', '로컬메이트 프리미엄 버전을 구독하시면 더 많은 실시간 데이터를 바탕으로 정확한 가이드를 받으실 수 있습니다! 🚀');
            inputField.removeAttribute('disabled');
        }, 1500);
    }

});
