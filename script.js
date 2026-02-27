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

    let userLat = null;
    let userLon = null;

    // 1. 내 위치 가져오기 (GPS)
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                appendMessage('user', '📍 내 현재 위치 전송 중...');
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        userLat = position.coords.latitude;
                        userLon = position.coords.longitude;

                        try {
                            // 무료 Reverse Geocoding API 연동 (OSM Nominatim)
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLon}`);
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
                                    현재 계신 곳은 <strong>'${city}'</strong> 근처시군요!<br>
                                    이 위치를 기준으로 주변 카페나 맛집을 찾아드릴 수 있습니다. ☕️🍱
                                `;
                                appendMessage('ai', aiReply, true);
                            }, 500);

                        } catch (error) {
                            setTimeout(() => {
                                appendMessage('ai', `<strong>🧭 좌표 확인 완료!</strong><br>위치 정보를 불러왔습니다. 무엇을 찾아드릴까요?`, true);
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

    // 진짜 주변 장소 찾는 함수 (OpenStreetMap Overpass API)
    async function findNearbyPlace(type) {
        if (!userLat || !userLon) return null;

        let nodeType = type === 'cafe' ? 'cafe' : 'restaurant';
        // 반경 1km 이내의 카페나 식당 한 개만 가져오기
        const query = `[out:json];node(around:1000,${userLat},${userLon})[amenity=${nodeType}];out 1;`;
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.elements && data.elements.length > 0) {
                const place = data.elements[0];
                const placeName = place.tags.name || (type === 'cafe' ? '이름 없는 숨은 동네 카페' : '이름 없는 숨은 현지 식당');
                return { name: placeName, lat: place.lat, lon: place.lon };
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    }

    // Handle Manual Input
    async function handleUserInput() {
        const text = inputField.value.trim();
        if (text === '') return;

        appendMessage('user', text);
        inputField.value = '';

        inputField.setAttribute('disabled', 'true');
        appendMessage('ai', `<i class="fa-solid fa-circle-notch fa-spin"></i> 실시간 정보 검색 중...`, true);

        const chatBoxDivs = chatBox.querySelectorAll('.message.ai');
        const loadingMsg = chatBoxDivs[chatBoxDivs.length - 1];

        // 대답 준비
        let aiReply = '';

        if (text.includes('카페')) {
            const place = await findNearbyPlace('cafe');
            if (place) {
                aiReply = `
                    현재 계신 곳 근처의 멋진 카페를 찾았습니다! ☕️<br>
                    <strong>"${place.name}"</strong><br><br>
                    <a href="https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}" target="_blank" class="action-btn map-btn">
                        <i class="fa-solid fa-map-location-dot"></i> 구글 지도로 열기
                    </a>
                    <a href="https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(place.name)}&lat=${place.lat}&lng=${place.lon}" target="_blank" class="action-btn map-btn" style="background: rgba(3, 199, 90, 0.1); color: #03c75a; border-color: rgba(3, 199, 90, 0.4);">
                        <i class="fa-solid fa-map-location-dot"></i> 네이버 지도로 열기
                    </a>
                `;
            } else if (!userLat) {
                aiReply = `주변 카페를 찾으려면 먼저 입력창 왼쪽의 📍<strong>위치 전송 버튼</strong>을 눌러주세요!`;
            } else {
                aiReply = `반경 1km 내에서 지도에 등록된 카페를 찾지 못했습니다. 😢 주변 이동 후 다시 시도해보세요.`;
            }
        } else if (text.includes('맛집') || text.includes('식당') || text.includes('밥')) {
            const place = await findNearbyPlace('restaurant');
            if (place) {
                aiReply = `
                    숨겨진 현지 느낌의 식당을 하나 찾았습니다! 🍱<br>
                    <strong>"${place.name}"</strong><br><br>
                    <a href="https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}" target="_blank" class="action-btn map-btn">
                        <i class="fa-solid fa-map-location-dot"></i> 구글 지도로 열기
                    </a>
                    <a href="https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(place.name)}&lat=${place.lat}&lng=${place.lon}" target="_blank" class="action-btn map-btn" style="background: rgba(3, 199, 90, 0.1); color: #03c75a; border-color: rgba(3, 199, 90, 0.4);">
                        <i class="fa-solid fa-map-location-dot"></i> 네이버 지도로 열기
                    </a>
                `;
            } else if (!userLat) {
                aiReply = `맛집을 추천해 드리려면, 먼저 입력창 왼쪽의 📍<strong>위치 전송 버튼</strong>을 눌러주세요!`;
            } else {
                aiReply = `반경 1km 내에서 지도에 등록된 식당을 찾지 못했습니다. 😢`;
            }
        } else if (text.includes('일본어') || text.includes('말해')) {
            const jpnText = "에고오 하나세루 스타후와 이마스카?";
            const jpnReal = "英語を話せるスタッフはいますか？";
            aiReply = `
                상황에 맞게 이렇게 말씀해 보세요! 🗣️<br>
                <strong>"${jpnReal}"</strong><br>
                (${jpnText})<br><br>
                <button class="action-btn voice-btn" onclick="speakText('${jpnReal}', 'ja-JP')">
                    <i class="fa-solid fa-volume-high"></i> 일본어로 말하기
                </button>
            `;
        } else {
            // 범용 대화
            const genericResponses = [
                `"${text}" — 흥미롭네요! 로컬메이트는 아직 배우는 중이라, '카페', '맛집', '번역'에 대해서는 기가 막히게 알려드릴 수 있어요! 🚀`,
                `말씀해 주신 "${text}", 잘 들었습니다. 주변의 카페나 식당을 찾고 싶으시다면 언제든 물어보세요! 🕵️‍♂️`,
                `아하! 맞아요. 그런데 지금 계신 곳 근처의 맛집이 궁금하시다면 언제든지 제게 '맛집'이라고 외쳐주세요! 🍱`
            ];
            aiReply = genericResponses[Math.floor(Math.random() * genericResponses.length)];
        }

        // 로딩 메시지를 실제 답변으로 교체
        setTimeout(() => {
            loadingMsg.innerHTML = `
                <div class="bubble">${aiReply}</div>
                <span class="time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            `;
            inputField.removeAttribute('disabled');
            chatBox.scrollTop = chatBox.scrollHeight;
            inputField.focus();
        }, 800);
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
