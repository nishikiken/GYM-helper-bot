// Supabase Configuration - НУЖНО СОЗДАТЬ НОВУЮ ТАБЛИЦУ gym_users
const SUPABASE_URL = 'https://hyxyablgkjtoxcxnurkk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5eHlhYmxna2p0b3hjeG51cmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODE5NjksImV4cCI6MjA4NDc1Nzk2OX0._3HQYSymZ2ArXIN143gAiwulCL1yt7i5fiHaTd4bp5U';

console.log('=== SCRIPT LOADED ===');
console.log('Supabase URL:', SUPABASE_URL);
console.log('window.supabase available:', !!window.supabase);

// Инициализация Supabase после загрузки библиотеки
let supabaseClient;
if (window.supabase) {
    console.log('Initializing Supabase...');
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase initialized:', !!supabaseClient);
} else {
    console.error('Supabase library not loaded!');
}

// Telegram Web App
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#1c1c1e');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#8e8e93');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#0a84ff');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#2c2c2e');
}

// === ВСТРОЕННАЯ КОНСОЛЬ ДЛЯ ОТЛАДКИ ===
const debugLogs = [];
const maxLogs = 50;

function addDebugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    debugLogs.push({ message: logEntry, type });
    
    if (debugLogs.length > maxLogs) {
        debugLogs.shift();
    }
    
    updateDebugConsole();
}

function updateDebugConsole() {
    const consoleEl = document.getElementById('debug-console');
    if (!consoleEl) return;
    
    consoleEl.innerHTML = debugLogs.map(log => 
        `<div class="log-entry log-${log.type}">${log.message}</div>`
    ).join('');
    
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function toggleDebugConsole() {
    const consoleEl = document.getElementById('debug-console');
    if (consoleEl) {
        consoleEl.classList.toggle('active');
    }
}

// Делаем функцию глобальной чтобы работала из HTML
window.toggleDebugConsole = toggleDebugConsole;

// Перехватываем console.log, console.error, console.warn
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
    addDebugLog(args.join(' '), 'info');
    originalLog.apply(console, args);
};

console.error = function(...args) {
    addDebugLog('ERROR: ' + args.join(' '), 'error');
    originalError.apply(console, args);
};

console.warn = function(...args) {
    addDebugLog('WARN: ' + args.join(' '), 'warn');
    originalWarn.apply(console, args);
};

// Перехватываем необработанные ошибки
window.addEventListener('error', (e) => {
    addDebugLog(`UNCAUGHT ERROR: ${e.message} at ${e.filename}:${e.lineno}`, 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    addDebugLog(`UNHANDLED PROMISE: ${e.reason}`, 'error');
});

console.log('Debug console initialized');
// === КОНЕЦ КОНСОЛИ ===

// Загрузка данных пользователя из Telegram
function loadUserData() {
    console.log('=== loadUserData START ===');
    
    // СРАЗУ показываем нули чтобы интерфейс не зависал
    document.getElementById('user-tokens').textContent = '0';
    document.getElementById('user-rating').textContent = '0';
    
    console.log('Telegram WebApp available:', !!tg);
    
    if (tg) {
        console.log('initDataUnsafe:', tg.initDataUnsafe);
        console.log('User data available:', !!(tg.initDataUnsafe && tg.initDataUnsafe.user));
    }
    
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        console.log('User ID:', user.id);
        console.log('User name:', user.first_name);
        
        // Устанавливаем имя пользователя
        const userName = user.first_name || user.username || 'Пользователь';
        document.getElementById('user-name').textContent = userName;
        
        // Устанавливаем аватар (если есть)
        const avatarContainer = document.getElementById('user-avatar');
        if (user.photo_url) {
            avatarContainer.innerHTML = `<img src="${user.photo_url}" alt="Avatar">`;
        } else {
            // Если нет аватарки - показываем placeholder
            avatarContainer.innerHTML = '<div class="avatar-placeholder">👤</div>';
        }
        
        // Загрузка данных пользователя с сервера В ФОНЕ (не блокирует интерфейс)
        // Всегда передаем актуальную аватарку из Telegram (или null)
        const actualAvatarUrl = user.photo_url || null;
        console.log('Calling loadUserDataFromAPI...');
        loadUserDataFromAPI(user.id, userName, actualAvatarUrl).catch(err => {
            console.error('Failed to load user data:', err);
            // Интерфейс все равно работает с нулями
        });
    } else {
        console.warn('No Telegram user data available!');
        console.warn('This might be because:');
        console.warn('1. Bot is opened outside Telegram');
        console.warn('2. Telegram WebApp not initialized');
        console.warn('3. User data not passed by Telegram');
        
        // Показываем placeholder данные
        document.getElementById('user-name').textContent = 'Гость';
        document.getElementById('user-avatar').innerHTML = '<div class="avatar-placeholder">👤</div>';
        
        // Если есть Telegram но нет данных - пробуем получить хоть что-то
        if (tg) {
            console.log('Telegram object exists, trying to get any data...');
            console.log('Platform:', tg.platform);
            console.log('Version:', tg.version);
            console.log('initData:', tg.initData);
        }
    }
    
    console.log('=== loadUserData END ===');
}

// === API FUNCTIONS ===
// Загрузка данных пользователя с сервера
async function loadUserDataFromAPI(telegramId, name, avatarUrl) {
    console.log('=== loadUserDataFromAPI START ===');
    console.log('Telegram ID:', telegramId);
    console.log('Name:', name);
    console.log('Avatar URL:', avatarUrl);
    
    // Показываем нули сразу, чтобы интерфейс не зависал
    document.getElementById('user-tokens').textContent = '0';
    document.getElementById('user-rating').textContent = '0';
    
    // Проверяем что Supabase загружен
    if (!supabaseClient) {
        console.error('Supabase not initialized!');
        return;
    }
    
    console.log('Supabase is ready');
    
    try {
        console.log(`Loading user data for ${telegramId}...`);
        
        // Таймаут на случай если запрос зависнет
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        console.log('Fetching user from database...');
        
        // Пытаемся получить данные пользователя из таблицы gym_users
        const fetchPromise = supabaseClient
            .from('gym_users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();
        
        const { data: existingUser, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]);
        
        console.log('Fetch result:', { existingUser, fetchError });
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        
        let userData;
        
        if (!existingUser) {
            // Пользователь не найден - создаем нового
            console.log('User not found, creating new user...');
            const { data: newUser, error: createError } = await supabaseClient
                .from('gym_users')
                .insert([{
                    telegram_id: telegramId,
                    name: name,
                    avatar_url: avatarUrl
                }])
                .select()
                .single();
            
            console.log('Create result:', { newUser, createError });
            
            if (createError) throw createError;
            userData = newUser;
        } else {
            // Обновляем данные существующего пользователя
            console.log('User found, updating...');
            const { data: updatedUser, error: updateError } = await supabaseClient
                .from('gym_users')
                .update({
                    name: name,
                    avatar_url: avatarUrl
                })
                .eq('telegram_id', telegramId)
                .select()
                .single();
            
            console.log('Update result:', { updatedUser, updateError });
            
            if (updateError) throw updateError;
            userData = updatedUser;
        }
        
        console.log('User data loaded:', userData);
        
        // Обновляем UI
        document.getElementById('user-tokens').textContent = userData.tokens || '0';
        document.getElementById('user-rating').textContent = userData.rating || '0';
        
        // Сохраняем ID пользователя для дальнейшего использования
        window.currentUserId = telegramId;
        
        // Загружаем кастомизацию
        await loadCustomization(userData);
        
        console.log('=== loadUserDataFromAPI SUCCESS ===');
        
    } catch (error) {
        console.error('=== loadUserDataFromAPI ERROR ===');
        console.error('Error loading user data:', error);
        console.error('Error details:', error.message, error.code, error.details);
        // В случае ошибки показываем нули
        document.getElementById('user-tokens').textContent = '0';
        document.getElementById('user-rating').textContent = '0';
    }
}

// Загрузка таблицы лидеров с сервера
async function loadLeaderboardFromAPI() {
    try {
        console.log('Loading leaderboard...');
        const { data: leaders, error } = await supabaseClient
            .from('gym_users')
            .select('*')
            .order('rating', { ascending: false })
            .order('tokens', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        console.log('Leaderboard loaded:', leaders);
        return leaders;
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        return [];
    }
}
// === END API FUNCTIONS ===

// Проверка: если возвращаемся с другой страницы - скрыть splash screen
if (sessionStorage.getItem('visited')) {
    const splash = document.getElementById('splash');
    if (splash) {
        splash.style.display = 'none';
    }
} else {
    sessionStorage.setItem('visited', 'true');
}

// Проверка: если нужно показать серпантин
if (sessionStorage.getItem('showConfetti') === 'true') {
    sessionStorage.removeItem('showConfetti');
    // Показываем серпантин после загрузки страницы
    setTimeout(() => {
        showConfetti();
    }, 100);
}

// Состояние калькулятора БЖУ
let currentGoal = 'bulk'; // bulk, cut, maintain
let currentGender = 'male';

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    createParticles();
    initSwipeGesture();
    renderLeaderboard();
    
    // Восстанавливаем кастомизацию если возвращаемся с другой страницы
    const savedCustomization = sessionStorage.getItem('userCustomization');
    if (savedCustomization) {
        try {
            const customization = JSON.parse(savedCustomization);
            console.log('Restoring customization from session:', customization);
            
            // Применяем сохраненную кастомизацию
            if (customization.equippedColor) {
                const colorItem = shopItems.colors.find(i => i.id === customization.equippedColor);
                if (colorItem) {
                    setTimeout(() => applyNameColor(colorItem.class), 500);
                }
            }
            
            if (customization.equippedBadge) {
                const badgeItem = shopItems.badges.find(i => i.id === customization.equippedBadge);
                if (badgeItem) {
                    setTimeout(() => applyBadgeColor(badgeItem.class), 500);
                }
            }
        } catch (e) {
            console.error('Error restoring customization:', e);
        }
    }
});


// Протягивание плашки пальцем (вверх и вниз)
function initSwipeGesture() {
    const profileCard = document.getElementById('user-profile-card');
    const darkOverlay = document.getElementById('dark-overlay');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let startBottom = 0;
    
    const screenHeight = window.innerHeight;
    const maxBottom = screenHeight - 120;
    const minBottom = 20;

    profileCard.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        
        const isLifted = profileCard.classList.contains('lifted');
        startBottom = isLifted ? maxBottom : minBottom;
        
        profileCard.style.transition = 'none';
        darkOverlay.style.transition = 'none';
    });

    profileCard.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        
        currentY = e.touches[0].clientY;
        const deltaY = startY - currentY;
        
        let newBottom = startBottom + deltaY;
        
        if (newBottom < minBottom) newBottom = minBottom;
        if (newBottom > maxBottom) newBottom = maxBottom;
        
        profileCard.style.bottom = newBottom + 'px';
        
        const overlayTop = screenHeight - newBottom;
        darkOverlay.style.setProperty('top', overlayTop + 'px', 'important');
        
        const progress = (newBottom - minBottom) / (maxBottom - minBottom);
        if (progress > 0.05) {
            darkOverlay.style.setProperty('opacity', '1', 'important');
            darkOverlay.style.setProperty('visibility', 'visible', 'important');
        } else {
            darkOverlay.style.setProperty('opacity', '0', 'important');
            darkOverlay.style.setProperty('visibility', 'hidden', 'important');
        }
        
        if (newBottom > minBottom + 50) {
            profileCard.querySelector('.swipe-indicator').style.opacity = '0';
        } else {
            profileCard.querySelector('.swipe-indicator').style.opacity = '1';
        }
    });

    profileCard.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        profileCard.style.transition = 'bottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        darkOverlay.style.transition = 'opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), visibility 0.4s';
        
        const deltaY = startY - currentY;
        
        const finalBottomOpen = maxBottom;
        const finalBottomClosed = minBottom;
        const finalOverlayTopOpen = screenHeight - maxBottom;
        const finalOverlayTopClosed = screenHeight;
        
        if (Math.abs(deltaY) > screenHeight * 0.2) {
            if (deltaY > 0) {
                profileCard.classList.add('lifted');
                darkOverlay.classList.add('active');
                profileCard.style.bottom = '';
                darkOverlay.style.setProperty('top', finalOverlayTopOpen + 'px', 'important');
                darkOverlay.style.setProperty('opacity', '1', 'important');
                darkOverlay.style.setProperty('visibility', 'visible', 'important');
                profileCard.style.cursor = 'default';
                profileCard.querySelector('.swipe-indicator').style.opacity = '0';
            } else {
                profileCard.classList.remove('lifted');
                darkOverlay.classList.remove('active');
                profileCard.style.bottom = '';
                darkOverlay.style.setProperty('top', finalOverlayTopClosed + 'px', 'important');
                darkOverlay.style.setProperty('opacity', '0', 'important');
                darkOverlay.style.setProperty('visibility', 'hidden', 'important');
                profileCard.style.cursor = 'pointer';
                profileCard.querySelector('.swipe-indicator').style.opacity = '1';
            }
        } else {
            const isLifted = profileCard.classList.contains('lifted');
            if (isLifted) {
                profileCard.style.bottom = '';
                darkOverlay.style.setProperty('top', finalOverlayTopOpen + 'px', 'important');
                darkOverlay.style.setProperty('opacity', '1', 'important');
                darkOverlay.style.setProperty('visibility', 'visible', 'important');
                profileCard.querySelector('.swipe-indicator').style.opacity = '0';
            } else {
                profileCard.style.bottom = '';
                darkOverlay.style.setProperty('top', finalOverlayTopClosed + 'px', 'important');
                darkOverlay.style.setProperty('opacity', '0', 'important');
                darkOverlay.style.setProperty('visibility', 'hidden', 'important');
                profileCard.querySelector('.swipe-indicator').style.opacity = '1';
            }
        }
        
        haptic();
    });

    profileCard.addEventListener('touchcancel', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        profileCard.style.transition = 'bottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        darkOverlay.style.transition = 'opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), visibility 0.4s';
        
        const finalOverlayTopOpen = screenHeight - maxBottom;
        const finalOverlayTopClosed = screenHeight;
        
        const isLifted = profileCard.classList.contains('lifted');
        if (isLifted) {
            profileCard.style.bottom = '';
            darkOverlay.style.setProperty('top', finalOverlayTopOpen + 'px', 'important');
            darkOverlay.style.setProperty('opacity', '1', 'important');
            darkOverlay.style.setProperty('visibility', 'visible', 'important');
        } else {
            profileCard.style.bottom = '';
            darkOverlay.style.setProperty('top', finalOverlayTopClosed + 'px', 'important');
            darkOverlay.style.setProperty('opacity', '0', 'important');
            darkOverlay.style.setProperty('visibility', 'hidden', 'important');
        }
    });
}

function openOverlay() {
    const profileCard = document.getElementById('user-profile-card');
    const darkOverlay = document.getElementById('dark-overlay');
    
    const screenHeight = window.innerHeight;
    const finalOverlayTop = screenHeight - 120;
    
    profileCard.style.bottom = '';
    
    profileCard.classList.add('lifted');
    darkOverlay.classList.add('active');
    
    darkOverlay.style.setProperty('top', finalOverlayTop + 'px', 'important');
    darkOverlay.style.setProperty('opacity', '1', 'important');
    darkOverlay.style.setProperty('visibility', 'visible', 'important');
    
    profileCard.style.cursor = 'default';
    
    haptic();
}

function closeOverlay() {
    const profileCard = document.getElementById('user-profile-card');
    const darkOverlay = document.getElementById('dark-overlay');
    
    profileCard.style.bottom = '';
    
    darkOverlay.style.setProperty('top', '100vh', 'important');
    darkOverlay.style.setProperty('opacity', '0', 'important');
    darkOverlay.style.setProperty('visibility', 'hidden', 'important');
    
    profileCard.classList.remove('lifted');
    darkOverlay.classList.remove('active');
    
    profileCard.style.cursor = 'pointer';
    
    const swipeIndicator = profileCard.querySelector('.swipe-indicator');
    if (swipeIndicator) {
        swipeIndicator.style.opacity = '1';
    }
    
    haptic();
}

function openLeaderboard() {
    const overlayContent = document.querySelector('.overlay-content');
    const leaderboardView = document.getElementById('step-leaderboard');
    const profileCard = document.getElementById('user-profile-card');
    const darkOverlay = document.getElementById('dark-overlay');
    
    overlayContent.classList.add('hiding');
    
    setTimeout(() => {
        leaderboardView.classList.add('active');
        profileCard.classList.add('in-leaderboard');
        
        const leaderboardOverlayTop = window.innerHeight - 165;
        darkOverlay.style.setProperty('top', leaderboardOverlayTop + 'px', 'important');
    }, 300);
    
    haptic();
}

function closeLeaderboard() {
    const leaderboardView = document.getElementById('step-leaderboard');
    const overlayContent = document.querySelector('.overlay-content');
    const profileCard = document.getElementById('user-profile-card');
    const darkOverlay = document.getElementById('dark-overlay');
    
    console.log('=== closeLeaderboard START ===');
    
    const stickOverlayToCard = () => {
        const cardRect = profileCard.getBoundingClientRect();
        const overlayTop = cardRect.bottom;
        
        console.log('Card position:', {
            top: cardRect.top,
            bottom: cardRect.bottom,
            height: cardRect.height
        });
        console.log('Setting overlay top to:', overlayTop);
        
        darkOverlay.style.setProperty('top', overlayTop + 'px', 'important');
        darkOverlay.style.setProperty('opacity', '1', 'important');
        darkOverlay.style.setProperty('visibility', 'visible', 'important');
    };
    
    leaderboardView.classList.remove('active');
    profileCard.classList.remove('in-leaderboard');
    
    setTimeout(stickOverlayToCard, 10);
    setTimeout(stickOverlayToCard, 30);
    setTimeout(stickOverlayToCard, 60);
    setTimeout(stickOverlayToCard, 100);
    setTimeout(stickOverlayToCard, 150);
    setTimeout(stickOverlayToCard, 200);
    setTimeout(stickOverlayToCard, 300);
    setTimeout(stickOverlayToCard, 400);
    
    setTimeout(() => {
        overlayContent.classList.remove('hiding');
    }, 300);
    
    console.log('=== closeLeaderboard END ===');
    haptic();
}

// Генерация таблицы лидеров с реальными данными с сервера
async function renderLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #8e8e93;">Загрузка...</div>';
    
    const leaders = await loadLeaderboardFromAPI();
    
    if (leaders.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #8e8e93;">Нет данных</div>';
        return;
    }
    
    container.innerHTML = leaders.map((leader, index) => {
        const rank = index + 1;
        let medal = '';
        let rankClass = '';
        
        if (rank === 1) {
            medal = '💎';
            rankClass = 'rank-1';
        } else if (rank === 2) {
            medal = '🥇';
            rankClass = 'rank-2';
        } else if (rank === 3) {
            medal = '🥈';
            rankClass = 'rank-3';
        }
        
        let nameClass = '';
        if (leader.name_color) {
            const colorItem = shopItems.colors.find(i => i.id === leader.name_color);
            if (colorItem) {
                nameClass = colorItem.class;
            }
        }
        
        let badgeClass = '';
        if (leader.badge_color) {
            const badgeItem = shopItems.badges.find(i => i.id === leader.badge_color);
            if (badgeItem) {
                badgeClass = badgeItem.class;
            }
        }
        
        return `
            <div class="leader-item ${rankClass} ${badgeClass}">
                <div class="leader-rank">${rank}</div>
                ${medal ? `<div class="leader-medal">${medal}</div>` : ''}
                <div class="leader-avatar">
                    ${leader.avatar_url ? 
                        `<img src="${leader.avatar_url}" alt="Avatar">` : 
                        '<div class="leader-avatar-placeholder">👤</div>'
                    }
                </div>
                <div class="leader-info">
                    <div class="leader-name ${nameClass}">${leader.name}</div>
                    <div class="leader-rating">
                        <span class="leader-rating-icon">⭐</span>
                        <span class="leader-rating-value">${leader.rating}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Создание анимированных частиц для профиля
function createParticles() {
    const particlesContainer = document.querySelector('.particles-bg');
    if (!particlesContainer) return;
    
    const particleCount = 20;
    const colors = [
        'rgba(135, 206, 250, 0.4)',
        'rgba(173, 216, 230, 0.35)',
        'rgba(176, 224, 230, 0.3)',
    ];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 2.5 + 1.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        const duration = Math.random() * 8 + 12;
        const delay = Math.random() * 5;
        
        const moveX = (Math.random() - 0.5) * 40;
        const moveY = (Math.random() - 0.5) * 30;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            left: ${startX}%;
            top: ${startY}%;
            animation: gentleFloat ${duration}s infinite ease-in-out;
            animation-delay: ${delay}s;
            box-shadow: 0 0 ${size * 3}px ${color};
            pointer-events: none;
            --move-x: ${moveX}px;
            --move-y: ${moveY}px;
        `;
        
        particlesContainer.appendChild(particle);
    }
}

// Навигация
function goToMain() {
    showStep('step-main');
    haptic();
}

function goToFAQ() {
    showStep('step-faq');
    
    // Инициализируем отслеживание скролла для кнопки "Вверх"
    setTimeout(() => {
        initScrollToTop('faq');
    }, 100);
    
    haptic();
}

function goToShop() {
    renderShop();
    showStep('step-shop');
    haptic();
}

function goToExchange() {
    showStep('step-exchange');
    haptic();
    
    const input = document.getElementById('exchange-amount');
    input.addEventListener('input', () => {
        const amount = parseInt(input.value) || 0;
        const tokens = Math.floor(amount / 100);
        document.getElementById('exchange-tokens').textContent = tokens;
    });
}

function goToExercises() {
    showStep('step-exercises');
    haptic();
}

function goToCalories() {
    showStep('step-calories');
    // Загружаем сохраненные данные если есть
    setTimeout(() => loadSavedCaloriesData(), 100);
    haptic();
}

function showConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a855f7', '#0a84ff', '#22c55e'];
    
    for (let i = 0; i < 40; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.3 + 's';
        confetti.style.animationDuration = (1 + Math.random() * 0.5) + 's';
        container.appendChild(confetti);
    }
    
    setTimeout(() => container.remove(), 2000);
}

function showStep(stepId) {
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function haptic(type = 'selection') {
    if (tg?.HapticFeedback) {
        if (type === 'success') {
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            tg.HapticFeedback.selectionChanged();
        }
    }
}

// === КНОПКА "ВВЕРХ" ===
function initScrollToTop(pageId) {
    const button = document.getElementById(`scroll-to-top-${pageId}`);
    if (!button) {
        console.error('Scroll to top button not found:', `scroll-to-top-${pageId}`);
        return;
    }
    
    const header = document.querySelector(`#step-${pageId} .header`);
    if (!header) {
        console.error('Header not found for page:', pageId);
        return;
    }
    
    // Отслеживаем скролл
    const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const headerRect = header.getBoundingClientRect();
        
        // Показываем кнопку если header ушел за верхнюю границу экрана
        if (headerRect.bottom < 0) {
            button.classList.add('visible');
        } else {
            button.classList.remove('visible');
        }
    };
    
    // Добавляем обработчик
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Проверяем сразу
    
    // Сохраняем обработчик чтобы можно было удалить
    button.dataset.scrollHandler = 'active';
    
    // Удаляем обработчик при уходе со страницы
    const checkPageActive = () => {
        const pageStep = document.getElementById(`step-${pageId}`);
        if (pageStep && !pageStep.classList.contains('active')) {
            window.removeEventListener('scroll', handleScroll);
            button.classList.remove('visible');
            button.dataset.scrollHandler = '';
        }
    };
    
    // Проверяем каждые 500ms
    const intervalId = setInterval(checkPageActive, 500);
    
    // Очищаем интервал через 30 секунд (на случай если что-то пойдет не так)
    setTimeout(() => clearInterval(intervalId), 30000);
}

function scrollToTop(pageId) {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    haptic();
}


// === КАЛЬКУЛЯТОР БЖУ ===
function switchCaloriesGoal(goal) {
    currentGoal = goal;
    document.querySelectorAll('.calories-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Сохраняем выбранную цель
    localStorage.setItem('caloriesGoal', goal);
    
    haptic();
}

function selectGender(gender) {
    currentGender = gender;
    document.querySelectorAll('.gender-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    haptic();
}

function showCaloriesForm() {
    const form = document.querySelector('.calories-form');
    const result = document.getElementById('calories-result');
    
    form.classList.remove('hidden');
    result.classList.remove('active');
    
    haptic();
}

function calculateCalories() {
    const age = parseInt(document.getElementById('age').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const activity = parseFloat(document.getElementById('activity').value);
    
    if (!age || !weight || !height) {
        if (tg?.showAlert) {
            tg.showAlert('Заполни все поля!');
        }
        return;
    }
    
    // Формула Миффлина-Сан Жеора для расчета базового метаболизма (BMR)
    let bmr;
    if (currentGender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    // Умножаем на коэффициент активности
    let tdee = bmr * activity;
    
    // Корректируем в зависимости от цели
    let calories;
    if (currentGoal === 'bulk') {
        calories = Math.round(tdee + 300); // +300 калорий для набора массы
    } else if (currentGoal === 'cut') {
        calories = Math.round(tdee - 500); // -500 калорий для сушки
    } else {
        calories = Math.round(tdee); // Поддержание веса
    }
    
    // Расчет БЖУ
    let protein, fats, carbs;
    
    if (currentGoal === 'bulk') {
        // Набор массы: 2г белка на кг, 1г жиров на кг, остальное углеводы
        protein = Math.round(weight * 2);
        fats = Math.round(weight * 1);
        carbs = Math.round((calories - protein * 4 - fats * 9) / 4);
    } else if (currentGoal === 'cut') {
        // Сушка: 2.2г белка на кг, 0.8г жиров на кг, остальное углеводы
        protein = Math.round(weight * 2.2);
        fats = Math.round(weight * 0.8);
        carbs = Math.round((calories - protein * 4 - fats * 9) / 4);
    } else {
        // Поддержание: 1.8г белка на кг, 1г жиров на кг, остальное углеводы
        protein = Math.round(weight * 1.8);
        fats = Math.round(weight * 1);
        carbs = Math.round((calories - protein * 4 - fats * 9) / 4);
    }
    
    // Показываем результаты
    document.getElementById('result-calories').textContent = calories;
    document.getElementById('result-protein').textContent = protein + ' г';
    document.getElementById('result-fats').textContent = fats + ' г';
    document.getElementById('result-carbs').textContent = carbs + ' г';
    
    // Сохраняем в localStorage
    const caloriesData = {
        goal: currentGoal,
        gender: currentGender,
        age, weight, height, activity,
        calories, protein, fats, carbs
    };
    localStorage.setItem('caloriesData', JSON.stringify(caloriesData));
    
    // Показываем результат поверх формы
    const form = document.querySelector('.calories-form');
    const result = document.getElementById('calories-result');
    
    form.classList.add('hidden');
    result.classList.add('active');
    
    haptic('success');
}

// Загрузка сохраненных данных при открытии страницы калькулятора
function loadSavedCaloriesData() {
    const savedData = localStorage.getItem('caloriesData');
    if (!savedData) return;
    
    try {
        const data = JSON.parse(savedData);
        
        // Восстанавливаем цель
        currentGoal = data.goal || 'bulk';
        document.querySelectorAll('.calories-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.includes('Масса') && data.goal === 'bulk') tab.classList.add('active');
            if (tab.textContent.includes('Сушка') && data.goal === 'cut') tab.classList.add('active');
            if (tab.textContent.includes('Поддержка') && data.goal === 'maintain') tab.classList.add('active');
        });
        
        // Восстанавливаем пол
        currentGender = data.gender || 'male';
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.gender === data.gender) btn.classList.add('active');
        });
        
        // Восстанавливаем значения полей
        if (data.age) document.getElementById('age').value = data.age;
        if (data.weight) document.getElementById('weight').value = data.weight;
        if (data.height) document.getElementById('height').value = data.height;
        if (data.activity) document.getElementById('activity').value = data.activity;
        
        // Показываем результаты
        document.getElementById('result-calories').textContent = data.calories;
        document.getElementById('result-protein').textContent = data.protein + ' г';
        document.getElementById('result-fats').textContent = data.fats + ' г';
        document.getElementById('result-carbs').textContent = data.carbs + ' г';
        
        // Показываем результат поверх формы
        const form = document.querySelector('.calories-form');
        const result = document.getElementById('calories-result');
        
        form.classList.add('hidden');
        result.classList.add('active');
        
        console.log('Loaded saved calories data:', data);
    } catch (e) {
        console.error('Error loading saved calories data:', e);
    }
}

// === МАГАЗИН КАСТОМИЗАЦИИ ===
const shopItems = {
    colors: [
        { id: 'blue', name: 'Синий неон', price: 50, class: 'neon-blue' },
        { id: 'red', name: 'Красный неон', price: 50, class: 'neon-red' },
        { id: 'purple', name: 'Фиолетовый неон', price: 75, class: 'neon-purple' },
        { id: 'green', name: 'Зеленый неон', price: 75, class: 'neon-green' }
    ],
    badges: [
        { id: 'blue', name: 'Синее стекло', price: 100, class: 'badge-blue' },
        { id: 'red', name: 'Красное стекло', price: 100, class: 'badge-red' },
        { id: 'purple', name: 'Фиолетовое стекло', price: 150, class: 'badge-purple' },
        { id: 'green', name: 'Зеленое стекло', price: 150, class: 'badge-green' }
    ]
};

let userInventory = {
    colors: [],
    badges: [],
    equippedColor: null,
    equippedBadge: null
};

function switchShopTab(tab) {
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.shop-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`shop-${tab}`).classList.add('active');
    
    haptic();
}

function renderShop() {
    renderShopColors();
    renderShopBadges();
}

function renderShopColors() {
    const container = document.getElementById('color-items');
    const userName = document.getElementById('user-name').textContent;
    
    container.innerHTML = shopItems.colors.map(item => {
        const owned = userInventory.colors.includes(item.id);
        const equipped = userInventory.equippedColor === item.id;
        
        return `
            <div class="shop-item ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}">
                <div class="shop-item-preview ${item.class}">
                    ${userName}
                </div>
                <div class="shop-item-actions">
                    ${owned ? 
                        `<button class="shop-action-btn ${equipped ? 'btn-unequip' : 'btn-equip'}" onclick="toggleEquipItem('colors', '${item.id}')">
                            ${equipped ? '✓ Снять' : 'Надеть'}
                        </button>` :
                        `<button class="shop-action-btn btn-buy" onclick="buyItem('colors', '${item.id}', ${item.price})">
                            Купить ${item.price} 🎟️
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

function renderShopBadges() {
    const container = document.getElementById('badge-items');
    
    container.innerHTML = shopItems.badges.map(item => {
        const owned = userInventory.badges.includes(item.id);
        const equipped = userInventory.equippedBadge === item.id;
        
        return `
            <div class="shop-item ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}">
                <div class="shop-item-preview ${item.class}" style="padding: 20px; border-radius: 16px;">
                    Плашка профиля
                </div>
                <div class="shop-item-actions">
                    ${owned ? 
                        `<button class="shop-action-btn ${equipped ? 'btn-unequip' : 'btn-equip'}" onclick="toggleEquipItem('badges', '${item.id}')">
                            ${equipped ? '✓ Снять' : 'Надеть'}
                        </button>` :
                        `<button class="shop-action-btn btn-buy" onclick="buyItem('badges', '${item.id}', ${item.price})">
                            Купить ${item.price} 🎟️
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

async function buyItem(type, itemId, price) {
    const currentTokens = parseInt(document.getElementById('user-tokens').textContent) || 0;
    
    if (currentTokens < price) {
        if (tg?.showAlert) {
            tg.showAlert(`Недостаточно токенов! Нужно ${price} 🎟️`);
        }
        haptic();
        return;
    }
    
    const item = shopItems[type].find(i => i.id === itemId);
    if (tg?.showConfirm) {
        tg.showConfirm(`Купить "${item.name}" за ${price} 🎟️?`, async (confirmed) => {
            if (confirmed) {
                await purchaseItem(type, itemId, price);
            }
        });
    } else {
        await purchaseItem(type, itemId, price);
    }
}

async function toggleEquipItem(type, itemId) {
    const item = shopItems[type].find(i => i.id === itemId);
    const isEquipped = (type === 'colors' ? userInventory.equippedColor : userInventory.equippedBadge) === itemId;
    
    if (isEquipped) {
        if (type === 'colors') {
            userInventory.equippedColor = null;
            const nameEl = document.getElementById('user-name');
            nameEl.className = '';
        } else {
            userInventory.equippedBadge = null;
            const card = document.getElementById('user-profile-card');
            card.classList.remove('badge-blue', 'badge-red', 'badge-purple', 'badge-green');
        }
    } else {
        if (type === 'colors') {
            userInventory.equippedColor = itemId;
            applyNameColor(item.class);
        } else {
            userInventory.equippedBadge = itemId;
            applyBadgeColor(item.class);
        }
    }
    
    await saveCustomization();
    
    sessionStorage.setItem('userCustomization', JSON.stringify({
        equippedColor: userInventory.equippedColor,
        equippedBadge: userInventory.equippedBadge,
        ownedColors: userInventory.colors,
        ownedBadges: userInventory.badges
    }));
    
    const leaderboardView = document.getElementById('step-leaderboard');
    if (leaderboardView.classList.contains('active')) {
        await renderLeaderboard();
    }
    
    renderShop();
    haptic('success');
}

async function purchaseItem(type, itemId, price) {
    try {
        console.log('=== PURCHASE START ===');
        console.log('Type:', type, 'ItemId:', itemId, 'Price:', price);
        
        const currentTokens = parseInt(document.getElementById('user-tokens').textContent) || 0;
        const newTokens = currentTokens - price;
        
        if (userInventory[type].includes(itemId)) {
            console.log('Item already owned');
            if (tg?.showAlert) {
                tg.showAlert('Этот предмет уже куплен!');
            }
            return;
        }
        
        const item = shopItems[type].find(i => i.id === itemId);
        
        userInventory[type].push(itemId);
        
        if (type === 'colors') {
            userInventory.equippedColor = itemId;
        } else {
            userInventory.equippedBadge = itemId;
        }
        
        console.log('Updated inventory:', userInventory);
        console.log('Calling RPC function...');
        
        const rpcFunction = type === 'colors' ? 'add_owned_color_gym' : 'add_owned_badge_gym';
        const rpcParam = type === 'colors' ? 'color_id' : 'badge_id';
        
        const { error: rpcError } = await supabaseClient.rpc(rpcFunction, {
            user_id: window.currentUserId,
            [rpcParam]: itemId
        });
        
        if (rpcError) {
            console.error('RPC error:', rpcError);
            throw rpcError;
        }
        
        console.log('RPC success - item added to array');
        
        console.log('Updating tokens and equipped items...');
        const updateData = {
            tokens: newTokens,
            name_color: userInventory.equippedColor,
            badge_color: userInventory.equippedBadge
        };
        
        console.log('Update data:', updateData);
        
        const { data: updateResult, error: updateError } = await supabaseClient
            .from('gym_users')
            .update(updateData)
            .eq('telegram_id', window.currentUserId)
            .select();
        
        if (updateError) {
            console.error('Update error:', updateError);
            console.error('Update error message:', updateError.message);
            console.error('Update error code:', updateError.code);
            throw updateError;
        }
        
        console.log('Update result:', updateResult);
        console.log('Saved successfully');
        
        if (type === 'colors' && item) {
            applyNameColor(item.class);
        } else if (type === 'badges' && item) {
            applyBadgeColor(item.class);
        }
        
        sessionStorage.setItem('userCustomization', JSON.stringify({
            equippedColor: userInventory.equippedColor,
            equippedBadge: userInventory.equippedBadge,
            ownedColors: userInventory.colors,
            ownedBadges: userInventory.badges
        }));
        
        document.getElementById('user-tokens').textContent = newTokens;
        
        const leaderboardView = document.getElementById('step-leaderboard');
        if (leaderboardView.classList.contains('active')) {
            await renderLeaderboard();
        }
        
        renderShop();
        
        if (tg?.showAlert) {
            tg.showAlert('Покупка успешна! 🎉');
        }
        
        haptic('success');
        showConfetti();
        
        console.log('=== PURCHASE END ===');
        
    } catch (error) {
        console.error('Purchase error:', error);
        console.error('Error message:', error?.message);
        console.error('Error code:', error?.code);
        console.error('Error details:', error?.details);
        console.error('Error hint:', error?.hint);
        console.error('Full error JSON:', JSON.stringify(error, null, 2));
        if (tg?.showAlert) {
            tg.showAlert('Ошибка покупки: ' + (error?.message || 'Unknown error'));
        }
    }
}

function applyNameColor(colorClass) {
    const nameEl = document.getElementById('user-name');
    nameEl.className = colorClass;
}

function applyBadgeColor(badgeClass) {
    const card = document.getElementById('user-profile-card');
    card.classList.remove('badge-blue', 'badge-red', 'badge-purple', 'badge-green');
    card.classList.add(badgeClass);
}

async function saveCustomization() {
    if (!window.currentUserId) return;
    
    try {
        const { error } = await supabaseClient
            .from('gym_users')
            .update({
                name_color: userInventory.equippedColor,
                badge_color: userInventory.equippedBadge
            })
            .eq('telegram_id', window.currentUserId);
        
        if (error) throw error;
        console.log('Customization saved');
    } catch (error) {
        console.error('Save customization error:', error);
    }
}

async function loadCustomization(userData) {
    if (!userData) return;
    
    console.log('Loading customization:', userData);
    
    const normalizeArray = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(item => {
            if (typeof item === 'string' && item.startsWith('{') && item.endsWith('}')) {
                return item.slice(1, -1);
            }
            return item;
        }).filter(item => item && item.length > 0);
    };
    
    if (userData.owned_colors) {
        userInventory.colors = normalizeArray(userData.owned_colors);
        console.log('Loaded colors:', userInventory.colors);
    }
    
    if (userData.owned_badges) {
        userInventory.badges = normalizeArray(userData.owned_badges);
        console.log('Loaded badges:', userInventory.badges);
    }
    
    if (userData.name_color) {
        userInventory.equippedColor = userData.name_color;
        const item = shopItems.colors.find(i => i.id === userData.name_color);
        if (item) {
            console.log('Applying name color:', item.class);
            applyNameColor(item.class);
        }
    }
    
    if (userData.badge_color) {
        userInventory.equippedBadge = userData.badge_color;
        const item = shopItems.badges.find(i => i.id === userData.badge_color);
        if (item) {
            console.log('Applying badge color:', item.class);
            applyBadgeColor(item.class);
        }
    }
    
    console.log('Customization loaded:', userInventory);
}

// === ОБМЕННИК ===
async function performExchange() {
    const amount = parseInt(document.getElementById('exchange-amount').value) || 0;
    
    if (amount < 100) {
        if (tg?.showAlert) {
            tg.showAlert('Минимум 100 рейтинга для обмена!');
        }
        return;
    }
    
    if (amount % 100 !== 0) {
        if (tg?.showAlert) {
            tg.showAlert('Количество должно быть кратно 100!');
        }
        return;
    }
    
    const currentRating = parseInt(document.getElementById('user-rating').textContent) || 0;
    
    if (currentRating < amount) {
        if (tg?.showAlert) {
            tg.showAlert('Недостаточно рейтинга!');
        }
        return;
    }
    
    const tokensToAdd = Math.floor(amount / 100);
    
    if (tg?.showConfirm) {
        tg.showConfirm(`Обменять ${amount} ⭐ на ${tokensToAdd} 🎟️?`, async (confirmed) => {
            if (confirmed) {
                await executeExchange(amount, tokensToAdd);
            }
        });
    } else {
        await executeExchange(amount, tokensToAdd);
    }
}

async function executeExchange(ratingAmount, tokensAmount) {
    try {
        const currentRating = parseInt(document.getElementById('user-rating').textContent) || 0;
        const currentTokens = parseInt(document.getElementById('user-tokens').textContent) || 0;
        
        const newRating = currentRating - ratingAmount;
        const newTokens = currentTokens + tokensAmount;
        
        const { error } = await supabaseClient
            .from('gym_users')
            .update({
                rating: newRating,
                tokens: newTokens
            })
            .eq('telegram_id', window.currentUserId);
        
        if (error) throw error;
        
        document.getElementById('user-rating').textContent = newRating;
        document.getElementById('user-tokens').textContent = newTokens;
        document.getElementById('exchange-amount').value = '';
        document.getElementById('exchange-tokens').textContent = '0';
        
        if (tg?.showAlert) {
            tg.showAlert(`Успешно! Получено ${tokensAmount} 🎟️`);
        }
        
        haptic('success');
        showConfetti();
        
    } catch (error) {
        console.error('Exchange error:', error);
        if (tg?.showAlert) {
            tg.showAlert('Ошибка обмена. Попробуй позже.');
        }
    }
}

// === УПРАЖНЕНИЯ И ТРЕНИРОВКИ ===
let workoutDays = [];
let currentDayId = null;
let activeWorkout = null;
let workoutTimerInterval = null;
let restTimerInterval = null;
let restDuration = 90; // секунды
let editDaysMode = false;
let editExercisesMode = false;

// Каталог готовых программ
const workoutCatalog = {
    chest: {
        name: 'Грудь',
        icon: '💪',
        exercises: [
            { name: 'Жим штанги лежа', sets: 4, reps: 10 },
            { name: 'Жим гантелей на наклонной', sets: 3, reps: 12 },
            { name: 'Разводка гантелей', sets: 3, reps: 15 },
            { name: 'Отжимания на брусьях', sets: 3, reps: 12 }
        ]
    },
    triceps: {
        name: 'Трицепс',
        icon: '💪',
        exercises: [
            { name: 'Французский жим', sets: 3, reps: 12 },
            { name: 'Разгибания на блоке', sets: 3, reps: 15 },
            { name: 'Жим узким хватом', sets: 4, reps: 10 },
            { name: 'Отжимания обратные', sets: 3, reps: 15 }
        ]
    },
    biceps: {
        name: 'Бицепс',
        icon: '💪',
        exercises: [
            { name: 'Подъем штанги на бицепс', sets: 4, reps: 10 },
            { name: 'Молотки с гантелями', sets: 3, reps: 12 },
            { name: 'Концентрированный подъем', sets: 3, reps: 12 },
            { name: 'Подъем на скамье Скотта', sets: 3, reps: 12 }
        ]
    },
    shoulders: {
        name: 'Плечи',
        icon: '💪',
        exercises: [
            { name: 'Жим штанги стоя', sets: 4, reps: 10 },
            { name: 'Махи гантелями в стороны', sets: 3, reps: 15 },
            { name: 'Махи в наклоне', sets: 3, reps: 15 },
            { name: 'Тяга к подбородку', sets: 3, reps: 12 }
        ]
    },
    back: {
        name: 'Спина',
        icon: '💪',
        exercises: [
            { name: 'Становая тяга', sets: 4, reps: 8 },
            { name: 'Подтягивания', sets: 4, reps: 10 },
            { name: 'Тяга штанги в наклоне', sets: 4, reps: 10 },
            { name: 'Тяга верхнего блока', sets: 3, reps: 12 }
        ]
    },
    legs: {
        name: 'Ноги',
        icon: '🦵',
        exercises: [
            { name: 'Приседания со штангой', sets: 4, reps: 10 },
            { name: 'Жим ногами', sets: 4, reps: 12 },
            { name: 'Разгибания ног', sets: 3, reps: 15 },
            { name: 'Сгибания ног', sets: 3, reps: 15 }
        ]
    }
};

// Загрузка дней тренировок из localStorage
function loadWorkoutDays() {
    const saved = localStorage.getItem('workoutDays');
    if (saved) {
        try {
            workoutDays = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading workout days:', e);
            workoutDays = [];
        }
    }
    renderWorkoutDays();
}

// Сохранение дней тренировок в localStorage
function saveWorkoutDays() {
    localStorage.setItem('workoutDays', JSON.stringify(workoutDays));
}

// Отрисовка списка дней тренировок
function renderWorkoutDays() {
    const container = document.getElementById('workout-days-list');
    
    if (workoutDays.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--tg-theme-hint-color);">Нет тренировок. Создай свою первую!</div>';
        return;
    }
    
    container.innerHTML = workoutDays.map(day => `
        <div class="workout-day-card ${editDaysMode ? 'edit-mode' : ''}" onclick="${editDaysMode ? '' : `openWorkoutDay('${day.id}')`}">
            <h3>${day.name}</h3>
            <p>${day.description}</p>
            <div class="exercises-count">${day.exercises.length} упражнений</div>
            <button class="edit-day-btn" onclick="event.stopPropagation(); showDayEditMenu('${day.id}')">⋮</button>
        </div>
    `).join('');
}

// Переключение режима редактирования дней
function toggleEditDays() {
    editDaysMode = !editDaysMode;
    const btn = document.getElementById('edit-days-btn');
    
    if (editDaysMode) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
    
    renderWorkoutDays();
    haptic();
}

// Показать меню редактирования дня
function showDayEditMenu(dayId) {
    const day = workoutDays.find(d => d.id === dayId);
    if (!day) return;
    
    if (tg?.showPopup) {
        tg.showPopup({
            title: day.name,
            message: 'Выбери действие',
            buttons: [
                { id: 'delete', type: 'destructive', text: 'Удалить' },
                { id: 'cancel', type: 'cancel' }
            ]
        }, (buttonId) => {
            if (buttonId === 'delete') {
                removeDay(dayId);
            }
        });
    } else {
        if (confirm(`Удалить "${day.name}"?`)) {
            removeDay(dayId);
        }
    }
}

// Удалить день
function removeDay(dayId) {
    const index = workoutDays.findIndex(d => d.id === dayId);
    if (index > -1) {
        workoutDays.splice(index, 1);
        saveWorkoutDays();
        renderWorkoutDays();
        haptic('success');
    }
}

// Показать модальное окно добавления дня
function showAddDayModal() {
    const modal = document.getElementById('add-day-modal');
    modal.classList.add('active');
    document.getElementById('day-name').value = '';
    document.getElementById('day-description').value = '';
    haptic();
}

// Закрыть модальное окно добавления дня
function closeAddDayModal() {
    const modal = document.getElementById('add-day-modal');
    modal.classList.remove('active');
    haptic();
}

// Сохранить новый день тренировки
function saveDayWorkout() {
    const name = document.getElementById('day-name').value.trim();
    const description = document.getElementById('day-description').value.trim();
    
    if (!name) {
        if (tg?.showAlert) {
            tg.showAlert('Введи название дня!');
        }
        return;
    }
    
    const newDay = {
        id: Date.now().toString(),
        name: name,
        description: description || 'Без описания',
        exercises: []
    };
    
    workoutDays.push(newDay);
    saveWorkoutDays();
    renderWorkoutDays();
    closeAddDayModal();
    haptic('success');
}

// Открыть детали дня тренировки
function openWorkoutDay(dayId) {
    currentDayId = dayId;
    const day = workoutDays.find(d => d.id === dayId);
    
    if (!day) return;
    
    document.getElementById('workout-day-title').textContent = day.name;
    document.getElementById('workout-day-subtitle').textContent = day.description;
    
    renderExercisesList(day.exercises);
    showStep('step-workout-day');
    haptic();
}

// Отрисовка списка упражнений
function renderExercisesList(exercises) {
    const container = document.getElementById('exercises-list');
    
    if (exercises.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--tg-theme-hint-color);">Нет упражнений. Добавь первое!</div>';
        return;
    }
    
    container.innerHTML = exercises.map((exercise, index) => `
        <div class="exercise-card ${editExercisesMode ? 'edit-mode' : ''}">
            <h3>${exercise.name}</h3>
            <div class="exercise-stats">
                <div class="exercise-stat">
                    <span>Подходы:</span>
                    <span>${exercise.sets}</span>
                </div>
                <div class="exercise-stat">
                    <span>Повторения:</span>
                    <span>${exercise.reps}</span>
                </div>
            </div>
            <button class="edit-exercise-btn" onclick="showExerciseEditMenu(${index})">⋮</button>
        </div>
    `).join('');
}

// Переключение режима редактирования упражнений
function toggleEditExercises() {
    editExercisesMode = !editExercisesMode;
    const btn = document.getElementById('edit-exercises-btn');
    
    if (editExercisesMode) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
    
    const day = workoutDays.find(d => d.id === currentDayId);
    if (day) {
        renderExercisesList(day.exercises);
    }
    haptic();
}

// Показать меню редактирования упражнения
function showExerciseEditMenu(exerciseIndex) {
    const day = workoutDays.find(d => d.id === currentDayId);
    if (!day) return;
    
    const exercise = day.exercises[exerciseIndex];
    
    if (tg?.showPopup) {
        tg.showPopup({
            title: exercise.name,
            message: 'Выбери действие',
            buttons: [
                { id: 'delete', type: 'destructive', text: 'Удалить' },
                { id: 'cancel', type: 'cancel' }
            ]
        }, (buttonId) => {
            if (buttonId === 'delete') {
                executeRemoveExercise(exerciseIndex);
            }
        });
    } else {
        if (confirm(`Удалить "${exercise.name}"?`)) {
            executeRemoveExercise(exerciseIndex);
        }
    }
}

// Удалить упражнение
function removeExercise(exerciseIndex) {
    showExerciseEditMenu(exerciseIndex);
}

// Показать модальное окно добавления упражнения
function showAddExerciseModal() {
    const modal = document.getElementById('add-exercise-modal');
    modal.classList.add('active');
    document.getElementById('exercise-name').value = '';
    document.getElementById('exercise-sets').value = '3';
    document.getElementById('exercise-reps').value = '12';
    haptic();
}

// Закрыть модальное окно добавления упражнения
function closeAddExerciseModal() {
    const modal = document.getElementById('add-exercise-modal');
    modal.classList.remove('active');
    haptic();
}

// Сохранить новое упражнение
function saveExercise() {
    const name = document.getElementById('exercise-name').value.trim();
    const sets = parseInt(document.getElementById('exercise-sets').value) || 3;
    const reps = parseInt(document.getElementById('exercise-reps').value) || 12;
    
    if (!name) {
        if (tg?.showAlert) {
            tg.showAlert('Введи название упражнения!');
        }
        return;
    }
    
    const day = workoutDays.find(d => d.id === currentDayId);
    if (!day) return;
    
    const newExercise = {
        id: Date.now().toString(),
        name: name,
        sets: sets,
        reps: reps
    };
    
    day.exercises.push(newExercise);
    saveWorkoutDays();
    renderExercisesList(day.exercises);
    closeAddExerciseModal();
    haptic('success');
}

// Начать тренировку
function startWorkout() {
    const day = workoutDays.find(d => d.id === currentDayId);
    if (!day || day.exercises.length === 0) {
        if (tg?.showAlert) {
            tg.showAlert('Добавь хотя бы одно упражнение!');
        }
        return;
    }
    
    // Инициализируем активную тренировку
    activeWorkout = {
        dayId: currentDayId,
        dayName: day.name,
        dayDescription: day.description,
        startTime: Date.now(),
        exercises: day.exercises.map(ex => ({
            ...ex,
            completedSets: 0
        }))
    };
    
    // Применяем цвет бейджа к плашке тренировки
    const profileCard = document.getElementById('workout-profile-card');
    if (userInventory.equippedBadge) {
        const badgeItem = shopItems.badges.find(i => i.id === userInventory.equippedBadge);
        if (badgeItem) {
            profileCard.className = 'workout-profile-card-fixed ' + badgeItem.class;
        }
    } else {
        profileCard.className = 'workout-profile-card-fixed';
    }
    
    // Скрываем кнопку каталога
    document.getElementById('catalog-fab').classList.remove('visible');
    
    // Создаем частицы для плашки
    createWorkoutParticles();
    
    renderActiveWorkout();
    showStep('step-active-workout');
    startWorkoutTimer();
    haptic();
}

// Создание частиц для плашки тренировки
function createWorkoutParticles() {
    const particlesContainer = document.querySelector('.workout-particles-bg');
    if (!particlesContainer) return;
    
    // Очищаем старые частицы
    particlesContainer.innerHTML = '';
    
    const particleCount = 15;
    const colors = [
        'rgba(135, 206, 250, 0.4)',
        'rgba(173, 216, 230, 0.35)',
        'rgba(176, 224, 230, 0.3)',
    ];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 2.5 + 1.5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        const duration = Math.random() * 8 + 12;
        const delay = Math.random() * 5;
        
        const moveX = (Math.random() - 0.5) * 40;
        const moveY = (Math.random() - 0.5) * 30;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            left: ${startX}%;
            top: ${startY}%;
            animation: gentleFloat ${duration}s infinite ease-in-out;
            animation-delay: ${delay}s;
            box-shadow: 0 0 ${size * 3}px ${color};
            pointer-events: none;
            --move-x: ${moveX}px;
            --move-y: ${moveY}px;
        `;
        
        particlesContainer.appendChild(particle);
    }
}

// Остановить тренировку
function stopWorkout() {
    if (tg?.showConfirm) {
        tg.showConfirm('Завершить тренировку?', (confirmed) => {
            if (confirmed) {
                executeStopWorkout();
            }
        });
    } else {
        executeStopWorkout();
    }
}

function executeStopWorkout() {
    if (workoutTimerInterval) {
        clearInterval(workoutTimerInterval);
        workoutTimerInterval = null;
    }
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }
    activeWorkout = null;
    openWorkoutDay(currentDayId);
    haptic();
}

// Таймер тренировки
function startWorkoutTimer() {
    const startTime = activeWorkout.startTime;
    
    const updateTimer = () => {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('workout-timer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    updateTimer();
    workoutTimerInterval = setInterval(updateTimer, 1000);
}

// Таймер отдыха
function toggleRestTimer() {
    const inline = document.getElementById('rest-timer-inline');
    const btn = document.getElementById('rest-btn');
    
    if (restTimerInterval) {
        // Остановить отдых
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        inline.classList.remove('active');
        btn.classList.remove('active');
        btn.textContent = '⏱️ Отдых (1:30)';
    } else {
        // Начать отдых
        let timeLeft = restDuration;
        
        const updateRestTimer = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            document.getElementById('rest-timer-display').textContent = 
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(restTimerInterval);
                restTimerInterval = null;
                inline.classList.remove('active');
                btn.classList.remove('active');
                btn.textContent = '⏱️ Отдых (1:30)';
                haptic('success');
            }
            
            timeLeft--;
        };
        
        inline.classList.add('active');
        btn.classList.add('active');
        btn.textContent = '⏸️ Отдых';
        updateRestTimer();
        restTimerInterval = setInterval(updateRestTimer, 1000);
    }
    
    haptic();
}

// Отрисовка активной тренировки
function renderActiveWorkout() {
    document.getElementById('active-workout-title').textContent = activeWorkout.dayName;
    document.getElementById('active-workout-description').textContent = activeWorkout.dayDescription;
    
    const container = document.getElementById('active-exercises-list');
    container.innerHTML = activeWorkout.exercises.map((exercise, exIndex) => {
        const allCompleted = exercise.completedSets >= exercise.sets;
        
        return `
            <div class="active-exercise-card ${allCompleted ? 'completed' : ''}">
                <h3>${exercise.name}</h3>
                <div class="exercise-progress">
                    <span class="progress-text">Подходы</span>
                    <span class="progress-count">${exercise.completedSets} / ${exercise.sets}</span>
                </div>
                <div class="exercise-progress">
                    <span class="progress-text">Повторения</span>
                    <span class="progress-count">${exercise.reps}</span>
                </div>
                <button class="complete-set-btn" 
                        onclick="completeSet(${exIndex})"
                        ${allCompleted ? 'disabled' : ''}>
                    ${allCompleted ? '✓ Завершено' : 'Выполнил подход'}
                </button>
            </div>
        `;
    }).join('');
}

// Отметить выполненный подход
function completeSet(exerciseIndex) {
    const exercise = activeWorkout.exercises[exerciseIndex];
    
    if (exercise.completedSets < exercise.sets) {
        exercise.completedSets++;
        renderActiveWorkout();
        haptic('success');
    }
}

// Удалить упражнение
function removeExercise(exerciseIndex) {
    if (tg?.showConfirm) {
        tg.showConfirm('Удалить упражнение?', (confirmed) => {
            if (confirmed) {
                executeRemoveExercise(exerciseIndex);
            }
        });
    } else {
        executeRemoveExercise(exerciseIndex);
    }
}

function executeRemoveExercise(exerciseIndex) {
    const day = workoutDays.find(d => d.id === currentDayId);
    if (!day) return;
    
    day.exercises.splice(exerciseIndex, 1);
    saveWorkoutDays();
    renderExercisesList(day.exercises);
    haptic();
}

// === КАТАЛОГ ТРЕНИРОВОК ===
function openCatalog() {
    renderCatalog();
    showStep('step-catalog');
    document.getElementById('catalog-fab').classList.remove('visible');
    haptic();
}

function closeCatalog() {
    goToExercises();
    haptic();
}

function renderCatalog() {
    const container = document.getElementById('catalog-categories');
    
    container.innerHTML = Object.entries(workoutCatalog).map(([key, category]) => `
        <div class="catalog-category">
            <h3>${category.icon} ${category.name}</h3>
            <div class="catalog-exercises">
                ${category.exercises.map(exercise => `
                    <div class="catalog-exercise-item" onclick='showAddFromCatalog(${JSON.stringify(exercise)})'>
                        <h4>${exercise.name}</h4>
                        <div class="catalog-exercise-stats">
                            <span>Подходы: ${exercise.sets}</span>
                            <span>Повторения: ${exercise.reps}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Показать модальное окно добавления из каталога
let catalogExerciseToAdd = null;

function showAddFromCatalog(exercise) {
    catalogExerciseToAdd = exercise;
    
    const modal = document.getElementById('add-from-catalog-modal');
    document.getElementById('catalog-exercise-name').textContent = 
        `${exercise.name} (${exercise.sets}×${exercise.reps})`;
    
    const daysList = document.getElementById('catalog-days-list');
    
    if (workoutDays.length === 0) {
        daysList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--tg-theme-hint-color);">Сначала создай день тренировки</div>';
    } else {
        daysList.innerHTML = workoutDays.map(day => `
            <div class="catalog-day-item" onclick="addExerciseFromCatalog('${day.id}')">
                <h4>${day.name}</h4>
                <p style="font-size: 13px; color: var(--tg-theme-hint-color); margin-top: 4px;">
                    ${day.description}
                </p>
            </div>
        `).join('');
    }
    
    modal.classList.add('active');
    haptic();
}

function closeAddFromCatalogModal() {
    const modal = document.getElementById('add-from-catalog-modal');
    modal.classList.remove('active');
    catalogExerciseToAdd = null;
    haptic();
}

function addExerciseFromCatalog(dayId) {
    if (!catalogExerciseToAdd) return;
    
    const day = workoutDays.find(d => d.id === dayId);
    if (!day) return;
    
    const newExercise = {
        id: Date.now().toString(),
        name: catalogExerciseToAdd.name,
        sets: catalogExerciseToAdd.sets,
        reps: catalogExerciseToAdd.reps
    };
    
    day.exercises.push(newExercise);
    saveWorkoutDays();
    
    closeAddFromCatalogModal();
    
    if (tg?.showAlert) {
        tg.showAlert(`Добавлено в "${day.name}"!`);
    }
    
    haptic('success');
}

// Показать кнопку каталога на странице упражнений
function goToExercises() {
    loadWorkoutDays();
    showStep('step-exercises');
    document.getElementById('catalog-fab').classList.add('visible');
    haptic();
}

// Скрыть кнопку каталога при уходе со страницы
function goToMain() {
    showStep('step-main');
    document.getElementById('catalog-fab').classList.remove('visible');
    haptic();
}

function goToFAQ() {
    showStep('step-faq');
    document.getElementById('catalog-fab').classList.remove('visible');
    
    // Инициализируем отслеживание скролла для кнопки "Вверх"
    setTimeout(() => {
        initScrollToTop('faq');
    }, 100);
    
    haptic();
}

function goToShop() {
    renderShop();
    showStep('step-shop');
    document.getElementById('catalog-fab').classList.remove('visible');
    haptic();
}

function goToExchange() {
    showStep('step-exchange');
    document.getElementById('catalog-fab').classList.remove('visible');
    haptic();
    
    const input = document.getElementById('exchange-amount');
    input.addEventListener('input', () => {
        const amount = parseInt(input.value) || 0;
        const tokens = Math.floor(amount / 100);
        document.getElementById('exchange-tokens').textContent = tokens;
    });
}

function goToCalories() {
    showStep('step-calories');
    document.getElementById('catalog-fab').classList.remove('visible');
    // Загружаем сохраненные данные если есть
    setTimeout(() => loadSavedCaloriesData(), 100);
    haptic();
}

// Инициализация при загрузке страницы упражнений
document.addEventListener('DOMContentLoaded', () => {
    loadWorkoutDays();
});

// Делаем функции глобальными
window.showAddDayModal = showAddDayModal;
window.closeAddDayModal = closeAddDayModal;
window.saveDayWorkout = saveDayWorkout;
window.openWorkoutDay = openWorkoutDay;
window.showAddExerciseModal = showAddExerciseModal;
window.closeAddExerciseModal = closeAddExerciseModal;
window.saveExercise = saveExercise;
window.startWorkout = startWorkout;
window.stopWorkout = stopWorkout;
window.toggleRestTimer = toggleRestTimer;
window.completeSet = completeSet;
window.removeExercise = removeExercise;
window.openCatalog = openCatalog;
window.closeCatalog = closeCatalog;
window.showAddFromCatalog = showAddFromCatalog;
window.closeAddFromCatalogModal = closeAddFromCatalogModal;
window.addExerciseFromCatalog = addExerciseFromCatalog;
window.toggleEditDays = toggleEditDays;
window.toggleEditExercises = toggleEditExercises;
window.showDayEditMenu = showDayEditMenu;
window.showExerciseEditMenu = showExerciseEditMenu;
