// Krok 1: Importy i konfiguracja ID aplikacji
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// --- WAŻNE: ZMIEŃ NA ID TWOJEJ APLIKACJI ---
const APLIKACJA_ID = "position-calc"; 
// -----------------------------------------

// Krok 2: Konfiguracja i inicjalizacja Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCRKyqcz7xd4ykSB7R1Tm_c_bmE8UVLiLE",
    authDomain: "topfund-1d82e.firebaseapp.com",
    projectId: "topfund-1d82e",
    storageBucket: "topfund-1d82e.firebasestorage.app",
    messagingSenderId: "1027710020899",
    appId: "1:1027710020899:web:2e70d77b312ce19242b096"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Krok 3: Funkcja pomocnicza do haszowania hasła
async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Krok 4: Główna logika po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    // Pobranie elementów ze strony
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginErrorElement = document.getElementById('loginError');
    const appContainer = document.getElementById('app');

    // Automatyczne uzupełnianie nazwy użytkownika
    const savedUsername = localStorage.getItem('lastUsername');
    if (savedUsername) {
        loginUsernameInput.value = savedUsername;
        loginPasswordInput.focus(); // Ustaw focus na polu hasła
    }

    // Obsługa wysłania formularza logowania
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Zatrzymaj domyślną akcję formularza
        loginErrorElement.textContent = ''; // Wyczyść poprzednie błędy

        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;
        const hashedPassword = await hashPassword(password);

        try {
            // Zapytanie do Firebase o użytkownika o podanej nazwie
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("name", "==", username));
            const usersSnapshot = await getDocs(q);

            // Sprawdzenie, czy użytkownik istnieje
            if (usersSnapshot.empty) {
                loginErrorElement.textContent = 'Nieprawidłowa nazwa użytkownika lub hasło.';
                return;
            }

            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();

            // Sprawdzenie, czy hasło się zgadza
            if (userData.hashedPassword === hashedPassword) {
                // Hasło poprawne, teraz sprawdź uprawnienia
                const userPermissions = userData.permissions || [];

                // Zezwól na logowanie, jeśli użytkownik to 'Topciu' (master user)
                // LUB jeśli jego tablica uprawnień zawiera ID tej aplikacji
                if (userData.name === 'Topciu' || userPermissions.includes(APLIKACJA_ID)) {
                    // --- SUKCES LOGOWANIA ---
                    localStorage.setItem('lastUsername', username); // Zapisz nazwę użytkownika
                    loginModal.classList.add('hidden');
                    appContainer.classList.remove('hidden');
                    
                    // WAŻNE: Tutaj wywołaj funkcję inicjalizującą Twoją aplikację
                    initApp();
                } else {
                    // BŁĄD - BRAK UPRAWNIEŃ
                    loginErrorElement.textContent = 'Brak uprawnień do tej aplikacji.';
                }
            } else {
                // BŁĄD - NIEPRAWIDŁOWE HASŁO
                loginErrorElement.textContent = 'Nieprawidłowa nazwa użytkownika lub hasło.';
            }
        } catch (error) {
            console.error("Błąd logowania: ", error);
            loginErrorElement.textContent = 'Wystąpił błąd podczas logowania. Spróbuj ponownie.';
        }
    });

    function initApp() {
        const capitalInput = document.getElementById('capital');
        const groupCountInput = document.getElementById('groupCount');
        const positionCountInput = document.getElementById('positionCount');
        const weightFactorInput = document.getElementById('weightFactor');
        const resultsContainer = document.getElementById('results');
        const weightsContainer = document.getElementById('weights-container');
        const weightsCard = document.getElementById('weightsCard');
        const toggleWeightsBtn = document.getElementById('toggleWeights');
        const defaultPresetBtn = document.getElementById('defaultPreset');
        const aggressivePresetBtn = document.getElementById('aggressivePreset');
        const customPresetBtn = document.getElementById('customPreset');

        const groupCountValue = document.getElementById('groupCountValue');
        const positionCountValue = document.getElementById('positionCountValue');
        const weightFactorValue = document.getElementById('weightFactorValue');

        const defaultSettings = { groups: 6, positions: 3, weightFactor: 16 };
        const aggressiveSettings = { groups: 6, positions: 1, weightFactor: 35 };

        loadCapitalFromStorage();
        // Load presets but don't calculate yet
        loadActivePreset(false);

        weightsCard.classList.remove('hidden');
        weightsCard.classList.add('hidden-by-toggle');
        toggleWeightsBtn.textContent = 'Pokaż wagi';

        [capitalInput, groupCountInput, positionCountInput, weightFactorInput].forEach(input => {
            input.addEventListener('input', () => {
                if (input.type === 'range') {
                    updateSliderBackground(input);
                }
                if (input.id === 'groupCount' || input.id === 'weightFactor') {
                    generateWeightInputs();
                }
                calculate();
                if (input.id === 'capital') {
                    saveCapitalToStorage();
                }
                setActivePreset(customPresetBtn);
                saveActivePreset('custom');
                saveCustomSettings();
            });
        });

        toggleWeightsBtn.addEventListener('click', () => {
            weightsCard.classList.toggle('hidden-by-toggle');
            toggleWeightsBtn.textContent = weightsCard.classList.contains('hidden-by-toggle') ? 'Pokaż wagi' : 'Ukryj wagi';
        });

        defaultPresetBtn.addEventListener('click', () => {
            applyPreset(defaultSettings);
            setActivePreset(defaultPresetBtn);
            saveActivePreset('default');
        });

        aggressivePresetBtn.addEventListener('click', () => {
            applyPreset(aggressiveSettings);
            setActivePreset(aggressivePresetBtn);
            saveActivePreset('aggressive');
        });

        customPresetBtn.addEventListener('click', () => {
            loadCustomSettings(true);
            setActivePreset(customPresetBtn);
            saveActivePreset('custom');
        });

        // Perform initial generation and calculation after everything is set up
        generateWeightInputs();
        calculate();
        
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            updateSliderBackground(slider);
        });
    }

    function applyPreset(settings, doCalculate = true) {
        const groupCountInput = document.getElementById('groupCount');
        const positionCountInput = document.getElementById('positionCount');
        const weightFactorInput = document.getElementById('weightFactor');

        groupCountInput.value = settings.groups;
        positionCountInput.value = settings.positions;
        weightFactorInput.value = settings.weightFactor;
        [groupCountInput, positionCountInput, weightFactorInput].forEach(updateSliderBackground);
        
        if (doCalculate) {
            generateWeightInputs();
            calculate();
        }
    }

    function setActivePreset(activeBtn) {
        const defaultPresetBtn = document.getElementById('defaultPreset');
        const aggressivePresetBtn = document.getElementById('aggressivePreset');
        const customPresetBtn = document.getElementById('customPreset');
        [defaultPresetBtn, aggressivePresetBtn, customPresetBtn].forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    function generateWeightInputs() {
        const weightsContainer = document.getElementById('weights-container');
        const groupCountInput = document.getElementById('groupCount');
        const weightFactorInput = document.getElementById('weightFactor');

        weightsContainer.innerHTML = '';
        const groupCount = parseInt(groupCountInput.value);
        let currentWeight = 1;

        for (let i = 0; i < groupCount; i++) {
            const weightGroup = document.createElement('div');
            weightGroup.className = 'weight-input-group';
            const label = document.createElement('label');
            label.textContent = `Waga ${i + 1}`;
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'weight-input';
            input.step = '0.01';
            input.value = currentWeight.toFixed(2);
            input.addEventListener('input', calculate);
            weightGroup.appendChild(label);
            weightGroup.appendChild(input);
            weightsContainer.appendChild(weightGroup);
            currentWeight *= (1 + parseFloat(weightFactorInput.value) / 100);
        }
    }

    function formatInt(value) {
        const rounded = Math.round(Number(value) || 0);
        return rounded.toLocaleString('pl-PL');
    }

    function calculate() {
        const capitalInput = document.getElementById('capital');
        const groupCountInput = document.getElementById('groupCount');
        const positionCountInput = document.getElementById('positionCount');
        const weightFactorInput = document.getElementById('weightFactor');
        const resultsContainer = document.getElementById('results');
        const groupCountValue = document.getElementById('groupCountValue');
        const positionCountValue = document.getElementById('positionCountValue');
        const weightFactorValue = document.getElementById('weightFactorValue');
        const weightInputs = document.querySelectorAll('.weight-input');

        const capital = parseFloat(capitalInput.value);
        const groupCount = parseInt(groupCountInput.value);
        const positionCount = parseInt(positionCountInput.value);

        groupCountValue.textContent = groupCount;
        positionCountValue.textContent = positionCount;
        weightFactorValue.textContent = weightFactorInput.value;

        if (isNaN(capital) || capital <= 0 || isNaN(groupCount) || groupCount <= 0 || isNaN(positionCount) || positionCount <= 0) {
            resultsContainer.innerHTML = '<p style="color: #ff5555;">Wprowadź poprawne wartości.</p>';
            return;
        }

        const weights = Array.from(weightInputs).map(input => parseFloat(input.value));
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        const capitalUnit = capital / totalWeight;

        resultsContainer.innerHTML = '';
        let positionStart = 1;

        for (let i = 0; i < groupCount; i++) {
            const groupCapital = capitalUnit * weights[i];
            const positionSize = groupCapital / positionCount;
            const positionEnd = positionStart + positionCount - 1;

            const card = document.createElement('div');
            card.className = 'result-card';
            const title = document.createElement('h3');
            title.textContent = `Grupa ${i + 1}`;
            const total = document.createElement('p');
            total.innerHTML = `Całkowity kapitał: <span class="amount">${formatInt(groupCapital)}</span> USD`;
            const position = document.createElement('p');
            const positionLabel = positionCount > 1 ? `Pozycje ${positionStart}-${positionEnd}` : `Pozycja ${positionStart}`;
            position.innerHTML = `${positionLabel}: <span class="amount">${formatInt(positionSize)}</span> USD`;
            card.appendChild(title);
            card.appendChild(total);
            card.appendChild(position);
            resultsContainer.appendChild(card);
            positionStart = positionEnd + 1;
        }
    }

    function updateSliderBackground(slider) {
        const percentage = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        slider.style.background = `linear-gradient(to right, ${getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#FFD700'} ${percentage}%, #444 ${percentage}%)`;
    }

    function saveCapitalToStorage() {
        const capitalInput = document.getElementById('capital');
        localStorage.setItem('positionCalculatorCapital', capitalInput.value);
    }

    function loadCapitalFromStorage() {
        const capitalInput = document.getElementById('capital');
        const savedCapital = localStorage.getItem('positionCalculatorCapital');
        if (savedCapital) {
            capitalInput.value = savedCapital;
        }
    }

    function saveActivePreset(preset) {
        localStorage.setItem('activePreset', preset);
    }

    function loadActivePreset(doCalculate = true) {
        const activePreset = localStorage.getItem('activePreset') || 'default';
        saveActivePreset(activePreset);
        const aggressivePresetBtn = document.getElementById('aggressivePreset');
        const customPresetBtn = document.getElementById('customPreset');
        const defaultPresetBtn = document.getElementById('defaultPreset');
        const defaultSettings = { groups: 6, positions: 3, weightFactor: 16 };
        const aggressiveSettings = { groups: 6, positions: 1, weightFactor: 35 };

        switch (activePreset) {
            case 'aggressive':
                applyPreset(aggressiveSettings, doCalculate);
                setActivePreset(aggressivePresetBtn);
                break;
            case 'custom':
                loadCustomSettings(doCalculate);
                setActivePreset(customPresetBtn);
                break;
            default:
                applyPreset(defaultSettings, doCalculate);
                setActivePreset(defaultPresetBtn);
                break;
        }
    }

    function saveCustomSettings() {
        const groupCountInput = document.getElementById('groupCount');
        const positionCountInput = document.getElementById('positionCount');
        const weightFactorInput = document.getElementById('weightFactor');
        const customSettings = {
            groups: groupCountInput.value,
            positions: positionCountInput.value,
            weightFactor: weightFactorInput.value
        };
        localStorage.setItem('customSettings', JSON.stringify(customSettings));
    }

    function loadCustomSettings(doCalculate = true) {
        const savedSettings = JSON.parse(localStorage.getItem('customSettings'));
        const defaultSettings = { groups: 6, positions: 3, weightFactor: 20 };
        if (savedSettings) {
            applyPreset(savedSettings, doCalculate);
        } else {
            applyPreset(defaultSettings, doCalculate);
        }
    }
});
