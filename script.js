import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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

async function hashPassword(password) {
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginErrorElement = document.getElementById('loginError');
    const appContainer = document.getElementById('app');

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

    const defaultSettings = { groups: 6, positions: 3, weightFactor: 20 };
    const aggressiveSettings = { groups: 6, positions: 1, weightFactor: 35 };

    // Login Logic
    const savedUsername = localStorage.getItem('lastUsername');
    if (savedUsername) {
        loginUsernameInput.value = savedUsername;
        loginPasswordInput.focus();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;

        if (username !== 'Topciu') {
            loginErrorElement.textContent = 'Nieprawidłowa nazwa użytkownika lub hasło.';
            return;
        }

        const hashedPassword = await hashPassword(password);

        try {
            const usersSnapshot = await getDocs(query(collection(db, "users"), where("name", "==", username)));
            if (usersSnapshot.empty) {
                loginErrorElement.textContent = 'Nieprawidłowa nazwa użytkownika lub hasło.';
                return;
            }

            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.hashedPassword === hashedPassword) {
                localStorage.setItem('lastUsername', username);
                loginModal.classList.add('hidden');
                appContainer.classList.remove('hidden');
                document.body.classList.add('app-loaded'); // Add class to trigger animations
                initApp();
            } else {
                loginErrorElement.textContent = 'Nieprawidłowa nazwa użytkownika lub hasło.';
            }
        } catch (error) {
            console.error("Błąd logowania: ", error);
            loginErrorElement.textContent = 'Wystąpił błąd podczas logowania.';
        }
    });

    function initApp() {
        loadCapitalFromStorage();
        loadActivePreset();

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
                // Switch to custom preset on change
                setActivePreset(customPresetBtn);
                saveActivePreset('custom');
                saveCustomSettings();
            });
        });

        toggleWeightsBtn.addEventListener('click', () => {
            weightsCard.classList.toggle('hidden');
            toggleWeightsBtn.textContent = weightsCard.classList.contains('hidden') ? 'Pokaż wagi' : 'Ukryj wagi';
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
            loadCustomSettings();
            setActivePreset(customPresetBtn);
            saveActivePreset('custom');
        });
    }

    function applyPreset(settings) {
        groupCountInput.value = settings.groups;
        positionCountInput.value = settings.positions;
        weightFactorInput.value = settings.weightFactor;
        [groupCountInput, positionCountInput, weightFactorInput].forEach(updateSliderBackground);
        generateWeightInputs();
        calculate();
    }

    function setActivePreset(activeBtn) {
        [defaultPresetBtn, aggressivePresetBtn, customPresetBtn].forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    function generateWeightInputs() {
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

    function calculate() {
        const capital = parseFloat(capitalInput.value);
        const groupCount = parseInt(groupCountInput.value);
        const positionCount = parseInt(positionCountInput.value);
        const weightInputs = document.querySelectorAll('.weight-input');

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
            total.innerHTML = `Całkowity kapitał: <span class="amount">${groupCapital.toFixed(2)}</span> USD`;
            const position = document.createElement('p');
            const positionLabel = positionCount > 1 ? `Pozycje ${positionStart}-${positionEnd}` : `Pozycja ${positionStart}`;
            position.innerHTML = `${positionLabel}: <span class="amount">${positionSize.toFixed(2)}</span> USD`;
            card.appendChild(title);
            card.appendChild(total);
            card.appendChild(position);
            resultsContainer.appendChild(card);
            positionStart = positionEnd + 1;
        }
    }

    function updateSliderBackground(slider) {
        const percentage = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        slider.style.background = `linear-gradient(to right, #fd7e14 ${percentage}%, #444 ${percentage}%)`;
    }

    function saveCapitalToStorage() {
        localStorage.setItem('positionCalculatorCapital', capitalInput.value);
    }

    function loadCapitalFromStorage() {
        const savedCapital = localStorage.getItem('positionCalculatorCapital');
        if (savedCapital) {
            capitalInput.value = savedCapital;
        }
    }

    function saveActivePreset(preset) {
        localStorage.setItem('activePreset', preset);
    }

    function loadActivePreset() {
        const activePreset = localStorage.getItem('activePreset') || 'default';
        saveActivePreset(activePreset);
        switch (activePreset) {
            case 'aggressive':
                applyPreset(aggressiveSettings);
                setActivePreset(aggressivePresetBtn);
                break;
            case 'custom':
                loadCustomSettings();
                setActivePreset(customPresetBtn);
                break;
            default:
                applyPreset(defaultSettings);
                setActivePreset(defaultPresetBtn);
                break;
        }
    }

    function saveCustomSettings() {
        const customSettings = {
            groups: groupCountInput.value,
            positions: positionCountInput.value,
            weightFactor: weightFactorInput.value
        };
        localStorage.setItem('customSettings', JSON.stringify(customSettings));
    }

    function loadCustomSettings() {
        const savedSettings = JSON.parse(localStorage.getItem('customSettings'));
        if (savedSettings) {
            applyPreset(savedSettings);
        } else {
            // If no custom settings, load default
            applyPreset(defaultSettings);
        }
    }
});