// Import Firebase modules
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    collection
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ✅ Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCGb1pM85RNcIM3C39XYtxG-BTJlGmElOg",
    authDomain: "vote-petit.firebaseapp.com",
    projectId: "vote-petit",
    storageBucket: "vote-petit.firebasestorage.app",
    messagingSenderId: "333446829341",
    appId: "1:333446829341:web:ca47a9833181806c09bdf4",
    measurementId: "G-R75YYCWK1C"
};

// 🔥 Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🌐 Éléments du DOM
const resultsSection = document.getElementById("results-section");
const registerSection = document.getElementById("register-section");
const userForm = document.getElementById("user-form");
const userInfoSection = document.getElementById("user-info-section");
const voteSection = document.getElementById("vote-section");
const afterVoteSection = document.getElementById("after-vote-section");
const logoutBtn = document.getElementById("logout-btn");
const currentUserEmail = document.getElementById("current-user-email");
const currentUserClass = document.getElementById("current-user-class");
const candidateCards = document.querySelectorAll(".candidate-card");
const statsCards = document.querySelectorAll(".stats-card");

let chart;
let currentUser = null;

// 📊 Initialiser le graphique
function initChart(votes) {
    const ctx = document.getElementById("voteChart").getContext("2d");
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: ["Violet", "Marron", "Jaune"],
            datasets: [
                {
                    label: "Nombre de votes",
                    data: [votes.violet, votes.marron, votes.jaune],
                    backgroundColor: [
                        "rgba(138, 43, 226, 0.8)",
                        "rgba(139, 69, 19, 0.8)",
                        "rgba(255, 215, 0, 0.8)"
                    ],
                    borderColor: [
                        "rgb(138, 43, 226)",
                        "rgb(139, 69, 19)",
                        "rgb(255, 215, 0)"
                    ],
                    borderWidth: 2,
                    borderRadius: 12,
                    borderSkipped: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        },
    });
}

// 🔄 Mettre à jour les compteurs de votes (pour les stats publiques)
function updateVoteCounts(votes) {
    // Mettre à jour les cartes de statistiques
    statsCards.forEach(card => {
        const candidateId = card.querySelector('.candidate-card') ? card.querySelector('.candidate-card').getAttribute('data-id') : null;
        if (candidateId) {
            const countElement = card.querySelector('.vote-count');
            countElement.textContent = votes[candidateId] || 0;
        }
    });

    // Mettre à jour aussi les cartes stats principales
    const violetCount = document.querySelector('.stats-card:nth-child(1) .vote-count');
    const marronCount = document.querySelector('.stats-card:nth-child(2) .vote-count');
    const jauneCount = document.querySelector('.stats-card:nth-child(3) .vote-count');

    if (violetCount) violetCount.textContent = votes.violet || 0;
    if (marronCount) marronCount.textContent = votes.marron || 0;
    if (jauneCount) jauneCount.textContent = votes.jaune || 0;
}

// 🔄 Écoute en temps réel des votes (public)
onSnapshot(collection(db, "votes"), (snapshot) => {
    let votes = { violet: 0, marron: 0, jaune: 0 };
    snapshot.forEach((doc) => (votes[doc.id] = doc.data().count || 0));
    initChart(votes);
    updateVoteCounts(votes);
});

// 👤 Gestion du formulaire d'inscription
userForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userEmail = document.getElementById("user-email").value.trim().toLowerCase();
    const classLevel = document.getElementById("class-level").value;

    if (!userEmail || !classLevel) {
        showAlert("Veuillez remplir tous les champs", "error");
        return;
    }

    // Validation basique d'email
    if (!isValidEmail(userEmail)) {
        showAlert("Veuillez entrer une adresse email valide", "error");
        return;
    }

    try {
        // Vérifier si l'utilisateur a déjà voté
        const userRef = doc(db, "users", userEmail);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().hasVoted) {
            showAlert("Cette adresse email a déjà voté !", "error");
            return;
        }

        // Enregistrer l'utilisateur (sans vote pour l'instant)
        currentUser = {
            email: userEmail,
            classLevel: classLevel
        };

        // Sauvegarder dans localStorage
        saveUserToLocalStorage(currentUser);

        // Afficher les sections de vote
        registerSection.classList.add("hidden");
        userInfoSection.classList.remove("hidden");
        voteSection.classList.remove("hidden");

        // Afficher les infos utilisateur
        currentUserEmail.textContent = currentUser.email;
        currentUserClass.textContent = classLevel;

        showAlert(`Bienvenue ! Vous pouvez maintenant voter.`, "success");

    } catch (error) {
        console.error("Erreur:", error);
        showAlert("Erreur lors de l'inscription. Veuillez réessayer.", "error");
    }
});

// 🚪 Déconnexion
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem('currentVotingUser');
    currentUser = null;
    registerSection.classList.remove("hidden");
    userInfoSection.classList.add("hidden");
    voteSection.classList.add("hidden");
    afterVoteSection.classList.add("hidden");

    // Réactiver les cartes de vote
    candidateCards.forEach(card => {
        card.style.opacity = '1';
        card.style.cursor = 'pointer';
        card.classList.add('card-hover');
    });

    // Reset du formulaire
    userForm.reset();
});

// 🗳️ Gestion du vote
candidateCards.forEach((card) => {
    card.addEventListener("click", async () => {
        if (!currentUser) {
            showAlert("Veuillez vous inscrire d'abord", "error");
            return;
        }

        const candidateId = card.getAttribute("data-id");
        const voteRef = doc(db, "votes", candidateId);
        const userRef = doc(db, "users", currentUser.email);

        try {
            // Vérifier une dernière fois si l'utilisateur a déjà voté
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().hasVoted) {
                showAlert("Vous avez déjà voté !", "error");
                return;
            }

            // Animation de confirmation
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = 'scale(1)';
            }, 150);

            // Enregistrer le vote
            const voteSnap = await getDoc(voteRef);
            const currentCount = voteSnap.exists() ? voteSnap.data().count : 0;
            await setDoc(voteRef, { count: currentCount + 1 });

            // Marquer l'utilisateur comme ayant voté
            await setDoc(userRef, {
                hasVoted: true,
                votedFor: candidateId,
                votedAt: new Date(),
                email: currentUser.email,
                classLevel: currentUser.classLevel
            });

            // Afficher la section "après vote"
            voteSection.classList.add("hidden");
            userInfoSection.classList.add("hidden");
            afterVoteSection.classList.remove("hidden");

            showAlert("✅ Vote enregistré avec succès ! Merci pour votre participation.", "success");

        } catch (error) {
            console.error("Erreur lors du vote:", error);
            showAlert("❌ Erreur lors de l'enregistrement du vote. Veuillez réessayer.", "error");
        }
    });
});

// 💫 Fonction d'alerte personnalisée
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${type === 'error' ? 'bg-red-500 text-white' :
        type === 'success' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'
        } fade-in`;
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.classList.add('fade-out');
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 500);
    }, 4000);
}

// ✅ Validation d'email simple
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 💾 Sauvegarde dans localStorage
function saveUserToLocalStorage(user) {
    localStorage.setItem('currentVotingUser', JSON.stringify(user));
}

// 🔍 Vérification au chargement de la page
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('currentVotingUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            checkUserVoteStatus();
        } catch (e) {
            localStorage.removeItem('currentVotingUser');
        }
    }
});

// 🔍 Vérifier le statut de vote de l'utilisateur
async function checkUserVoteStatus() {
    if (!currentUser) return;

    try {
        const userRef = doc(db, "users", currentUser.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().hasVoted) {
            // L'utilisateur a déjà voté
            registerSection.classList.add("hidden");
            afterVoteSection.classList.remove("hidden");
            showAlert("Vous avez déjà voté. Merci pour votre participation !", "info");
            return;
        }

        // Afficher l'interface de vote
        registerSection.classList.add("hidden");
        userInfoSection.classList.remove("hidden");
        voteSection.classList.remove("hidden");
        currentUserEmail.textContent = currentUser.email;
        currentUserClass.textContent = currentUser.classLevel;

    } catch (error) {
        console.error("Erreur vérification statut:", error);
    }
}

console.log("Application de vote initialisée - Mode résultats publics + inscription email");