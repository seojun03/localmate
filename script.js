document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const inputField = document.querySelector('.input-area input');
    const sendBtn = document.querySelector('.send-btn');
    const locationBtn = document.getElementById('btn-location');

    // Gemini API 설정
    const GEMINI_API_KEY = 'gen-lang-client-0638971907';
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;


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
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLon}&accept-language=ko`);
                            const data = await response.json();
                            const addr = data.address;

                            // 동(neighbourhood) → 구(suburb/district) → 시(city) 순으로 최대한 깊게
                            const dong = addr.neighbourhood || addr.quarter || addr.hamlet || '';
                            const gu = addr.suburb || addr.city_district || addr.district || '';
                            const city = addr.city || addr.town || addr.village || addr.county || addr.country || '알 수 없는 지역';

                            // 조합된 상세 주소 (예: 광주광역시 수완동)
                            const detailAddr = [city, gu, dong].filter(v => v && v !== city).join(' ');
                            const shortCity = city;

                            // 상단 타이틀 영구 변경 (시 단위)
                            const titleEl = document.getElementById('ai-title');
                            if (titleEl) {
                                titleEl.innerText = `로컬메이트 AI (${shortCity})`;
                            }

                            // 성공적으로 위치를 가져왔을 때 로컬메이트의 답변
                            const fullDisplay = detailAddr ? `${city} ${detailAddr.replace(city, '').trim()}` : city;
                            setTimeout(() => {
                                const aiReply = `
                                    <strong>🧭 현재 위치 확인 완료!</strong><br>
                                    현재 계신 곳은 <strong>${fullDisplay || city}</strong>에 계시군요!<br>
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

    // 이미 보여준 장소 기억 (중복 방지)
    const shownPlaces = { cafe: new Set(), restaurant: new Set() };

    // 진짜 주변 장소 찾는 함수 (OpenStreetMap Overpass API)
    async function findNearbyPlace(type) {
        if (!userLat || !userLon) return null;

        const nodeType = type === 'cafe' ? 'cafe' : 'restaurant';
        // 반경 1.5km 이내 최대 20개 가져오기 (다양한 추천을 위해!)
        const query = `[out:json];node(around:1500,${userLat},${userLon})[amenity=${nodeType}][name];out 20;`;
        try {
            const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.elements && data.elements.length > 0) {
                // 이름 있는 가게만 필터링
                const namedPlaces = data.elements.filter(p => p.tags && p.tags.name);
                // 아직 보여주지 않은 곳만 추려내기
                const unseenPlaces = namedPlaces.filter(p => !shownPlaces[type].has(p.tags.name));

                // 모두 다 보여줬으면 기억 초기화 후 다시 섞기
                if (unseenPlaces.length === 0 && namedPlaces.length > 0) {
                    shownPlaces[type].clear();
                    unseenPlaces.push(...namedPlaces);
                }

                if (unseenPlaces.length === 0) return null;

                // 랜덤으로 하나 선택
                const randomIndex = Math.floor(Math.random() * unseenPlaces.length);
                const place = unseenPlaces[randomIndex];
                const placeName = place.tags.name;

                // 이번에 보여준 곳 기록
                shownPlaces[type].add(placeName);

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
                // 구글: 가게이름 + 좌표 근접 검색으로 정밀도 향상
                const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=&center=${place.lat},${place.lon}`;
                // 네이버: 좌표 기반 정확한 URL (좌표로 핀 꽂기)
                const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}?c=${place.lon},${place.lat},17,0,0,0,dh`;
                aiReply = `
                    현재 계신 곳 근처의 멋진 카페를 찾았습니다! ☕️<br>
                    <strong>"${place.name}"</strong><br><br>
                    <a href="${googleUrl}" target="_blank" class="action-btn map-btn">
                        <i class="fa-solid fa-map-location-dot"></i> 구글 지도로 열기
                    </a>
                    <a href="${naverUrl}" target="_blank" class="action-btn map-btn" style="background: rgba(3, 199, 90, 0.1); color: #03c75a; border-color: rgba(3, 199, 90, 0.4);">
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
                const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&center=${place.lat},${place.lon}`;
                const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}?c=${place.lon},${place.lat},17,0,0,0,dh`;
                aiReply = `
                    숨겨진 현지 느낌의 식당을 하나 찾았습니다! 🍱<br>
                    <strong>"${place.name}"</strong><br><br>
                    <a href="${googleUrl}" target="_blank" class="action-btn map-btn">
                        <i class="fa-solid fa-map-location-dot"></i> 구글 지도로 열기
                    </a>
                    <a href="${naverUrl}" target="_blank" class="action-btn map-btn" style="background: rgba(3, 199, 90, 0.1); color: #03c75a; border-color: rgba(3, 199, 90, 0.4);">
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
            // 🧠 Gemini AI 실시간 대화
            const locationContext = userLat
                ? `사용자의 현재 위치: 위도 ${userLat.toFixed(4)}, 경도 ${userLon.toFixed(4)}.`
                : '사용자의 위치는 아직 연결되지 않았습니다.';

            const systemPrompt = `당신은 "로컬메이트 AI"입니다. 전 세계 여행자를 돕는 친절하고 유능한 현지 여행 가이드 AI입니다.
${locationContext}
위치 관련 질문에는 위의 좌표를 참고하세요. 짧고 핵심적으로 한국어로 답하세요. 마크다운은 사용하지 마세요.`;

            try {
                const response = await fetch(GEMINI_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: systemPrompt + '\n\n사용자: ' + text }] }
                        ]
                    })
                });
                const data = await response.json();
                if (data.candidates && data.candidates[0]) {
                    aiReply = data.candidates[0].content.parts[0].text
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br>');
                } else {
                    aiReply = '잠시 응답에 문제가 생겼습니다. 잠깐 뒤 다시 시도해주세요! 🙏';
                }
            } catch (e) {
                aiReply = '인터넷 연결이 불안정합니다. 다시 시도해 주세요! 😅';
            }
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
