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
                    async (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;

                        try {
                            // 무료 Reverse Geocoding API 연동 (OSM Nominatim)
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                            const data = await response.json();

                            // 도시나 구 이름 가져오기
                            const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.country || '알 수 없는 지역';

                            // 상단 타이틀 영구 변경
                            const titleEl = document.getElementById('ai-title');
                            if (titleEl) {
                                titleEl.innerText = `로컬메이트 AI (${city})`;
                            }

                            // 성공적으로 위치를 가져왔을 때 로컬메이트의 답변
                            setTimeout(() => {
                                const aiReply = `
                                    <strong>🧭 현재 위치 확인 완료!</strong><br>
                                    현재 계신 곳은 <strong>'${city}'</strong> 근처시군요! (위도: ${lat.toFixed(4)}, 경도: ${lon.toFixed(4)})<br><br>
                                    이 위치를 기준으로 주변의 와이파이 빠른 조용한 카페나 맛집을 찾아드릴까요?
                                `;
                                appendMessage('ai', aiReply, true);
                            }, 500);

                        } catch (error) {
                            setTimeout(() => {
                                appendMessage('ai', `<strong>🧭 좌표 확인 완료!</strong><br>(위도: ${lat.toFixed(4)}, 경도: ${lon.toFixed(4)})<br>지역 이름을 불러오는 데 실패했지만, 좌표를 바탕으로 검색을 시작할 수 있습니다!`, true);
                            }, 500);
                        }
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
            } else if (text.includes('맛집') || text.includes('식당') || text.includes('밥')) {
                const foodReply = `
                    숨겨진 현지인 찐맛집을 하나 찾았습니다! 🍣<br>
                    <strong>"우오베이 스시 (Uobei Sushi)"</strong><br>
                    ✅ 저렴한 가격 / 터치패널 주문(외국어 지원) / 회전초판<br><br>
                    <a href="https://www.google.com/maps/search/?api=1&query=Uobei+Sushi" target="_blank" class="action-btn map-btn">
                        <i class="fa-solid fa-map-location-dot"></i> 구글 지도로 바로 길찾기
                    </a>
                `;
                appendMessage('ai', foodReply, true);
            } else {
                // 범용 답변 (무료 테스트용)
                const genericReply = `
                    보내주신 <strong>"${text}"</strong>에 대해 가장 빠르고 정확한 로컬 정보를 분석 중입니다... 🕵️‍♂️<br><br>
                    (테스트 안내: 현재 데모 버전에서는 자유로운 대화가 가능하며 모든 데이터는 무료로 제공됩니다. <em>'카페 찾아줘', '맛집 알려줘', '감사합니다 일본어로 말해줘'</em>와 같이 상황에 맞는 키워드를 조합해보세요!)
                `;
                appendMessage('ai', genericReply, true);
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
        inputField.placeholder = "아무거나 자유롭게 질문해보세요!";
    }, 1000);

});
