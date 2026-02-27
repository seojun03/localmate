document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const inputField = document.querySelector('.input-area input');
    const sendBtn = document.querySelector('.send-btn');
    const locationBtn = document.getElementById('btn-location');

    function appendMessage(role, text, isHTML = false) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', role);
        msgDiv.style.opacity = '0'; // Start hidden for fadeIn animation

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const content = isHTML ? text : text.replace(/\n/g, '<br>');

        msgDiv.innerHTML = `
            <div class="bubble">${content}</div>
            <span class="time">${timeStr}</span>
        `;

        chatBox.appendChild(msgDiv);

        // Trigger reflow & animation
        setTimeout(() => {
            msgDiv.style.opacity = '1';
            chatBox.scrollTop = chatBox.scrollHeight;
        }, 50);
    }

    // TTS 기능 (음성 읽어주기)
    window.speakText = function (text, lang = 'ja-JP') {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            speechSynthesis.speak(utterance);
        } else {
            alert('이 브라우저에서는 음성 합성 기능을 지원하지 않습니다.');
        }
    };

    // 1. 내 위치 가져오기 (GPS)
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                appendMessage('user', '📍 내 현재 위치 전송 중...');
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        // 성공적으로 위치를 가져왔을 때 로컬메이트의 답변
                        setTimeout(() => {
                            const aiReply = `
                                <strong>🧭 현재 위치 확인 완료!</strong><br>
                                위도: ${lat.toFixed(4)}, 경도: ${lon.toFixed(4)}<br><br>
                                이 위치(반경 500m) 주변의 와이파이 빠른 조용한 카페를 찾아드릴까요?
                            `;
                            appendMessage('ai', aiReply, true);
                        }, 1000);
                    },
                    (error) => {
                        setTimeout(() => {
                            appendMessage('ai', '위치 정보를 가져오는 데 실패했습니다. 브라우저 설정에서 위치 접근을 허용해주세요! 🥲');
                        }, 500);
                    }
                );
            } else {
                alert('GPS를 지원하지 않는 브라우저입니다.');
            }
        });
    }

    // Handle Manual Input
    function handleUserInput() {
        const text = inputField.value.trim();
        if (text === '') return;

        appendMessage('user', text);
        inputField.value = '';

        // 사용자의 입력에 따른 간단한 키워드 매칭 반응
        setTimeout(() => {
            if (text.includes('카페')) {
                const cafeReply = `
                    지금 위치 근처 최고의 카페를 찾았습니다! ☕️<br>
                    <strong>"Streamer Coffee Company"</strong><br>
                    ✅ 기가 와이파이 / 콘센트 넉넉함<br><br>
                    <a href="https://www.google.com/maps/search/?api=1&query=Streamer+Coffee+Company" target="_blank" class="action-btn map-btn">
                        <i class="fa-solid fa-map-location-dot"></i> 구글 지도로 바로 길찾기
                    </a>
                `;
                appendMessage('ai', cafeReply, true);
            } else if (text.includes('일본어') || text.includes('말해')) {
                const jpnText = "에고오 하나세루 스타후와 이마스카?";
                const jpnReal = "英語を話せるスタッフはいますか？";
                const voiceReply = `
                    점원에게 이렇게 말씀해 보세요! 🗣️<br><br>
                    <strong>"${jpnReal}"</strong><br>
                    (${jpnText})<br><br>
                    직접 말하기 부담스러우시다면 아래 버튼을 눌러주세요. 제가 대신 현지인 발음으로 말해드릴게요!<br><br>
                    <button class="action-btn voice-btn" onclick="speakText('${jpnReal}', 'ja-JP')">
                        <i class="fa-solid fa-volume-high"></i> 일본어로 말하기
                    </button>
                    <button class="action-btn voice-btn" onclick="speakText('Is there any English-speaking staff here?', 'en-US')">
                        <i class="fa-solid fa-volume-high"></i> 영어로 말하기
                    </button>
                `;
                appendMessage('ai', voiceReply, true);
            } else {
                appendMessage('ai', '로컬메이트 프리미엄 버전을 구독하시면 더 많은 실시간 데이터를 바탕으로 정확한 가이드를 받으실 수 있습니다! 🚀');
            }
        }, 1000);
    }

    sendBtn.addEventListener('click', handleUserInput);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUserInput();
    });

    // Start Welcome Message
    setTimeout(() => {
        inputField.removeAttribute('disabled');
        inputField.placeholder = "'카페 추천해줘', '일본어로 말해줘' 등을 입력해보세요!";
    }, 1000);

});
