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

// Détection mobile améliorée
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 🌐 Éléments du DOM
const registerSection = document.getElementById("register-section");
const userForm = document.getElementById("user-form");
const userInfoSection = document.getElementById("user-info-section");
const voteSection = document.getElementById("vote-section");
const afterVoteSection = document.getElementById("after-vote-section");
const logoutBtn = document.getElementById("logout-btn");
const currentUserEmail = document.getElementById("current-user-email");
const currentUserClass = document.getElementById("current-user-class");
const candidateCards = document.querySelectorAll(".candidate-card");

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
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
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
                    ticks: { stepSize: 1 }
                },
                x: {
                    ticks: { font: { weight: 'bold' } }
                }
            },
        },
    });
}

// 🔄 Mettre à jour les compteurs de votes - CORRIGÉ
function updateVoteCounts(votes) {
    // Sélectionner les éléments par leur position dans le grid
    const voteCounts = document.querySelectorAll('.vote-count');
    if (voteCounts.length >= 3) {
        voteCounts[0].textContent = votes.violet || 0;
        voteCounts[1].textContent = votes.marron || 0;
        voteCounts[2].textContent = votes.jaune || 0;
    }
}

// 🔄 Écoute en temps réel des votes
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

    if (!isValidEmail(userEmail)) {
        showAlert("Veuillez entrer une adresse email valide", "error");
        return;
    }

    try {
        const userRef = doc(db, "users", userEmail);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().hasVoted) {
            showAlert("Cette adresse email a déjà voté !", "error");
            return;
        }

        currentUser = {
            email: userEmail,
            classLevel: classLevel
        };

        saveUserToLocalStorage(currentUser);

        registerSection.classList.add("hidden");
        userInfoSection.classList.remove("hidden");
        voteSection.classList.remove("hidden");

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

    candidateCards.forEach(card => {
        card.style.opacity = '1';
        card.style.cursor = 'pointer';
    });

    userForm.reset();
});

// 🗳️ Gestion du vote - Version Mobile Compatible
function setupVoteHandlers() {
    candidateCards.forEach((card) => {
        // Supprimer les anciens écouteurs
        card.replaceWith(card.cloneNode(true));
    });

    // Resélectionner après clonage
    const newCandidateCards = document.querySelectorAll(".candidate-card");

    newCandidateCards.forEach((card) => {
        // Événement pour desktop
        card.addEventListener("click", handleVote);

        // Événements pour mobile
        card.addEventListener("touchstart", function (e) {
            if (isMobile()) {
                this.style.transform = 'scale(0.95)';
                this.style.opacity = '0.8';
            }
        });

        card.addEventListener("touchend", function (e) {
            if (isMobile()) {
                e.preventDefault();
                this.style.transform = 'scale(1)';
                this.style.opacity = '1';
                handleVote.call(this, e);
            }
        });
    });
}

// Fonction de vote centralisée
async function handleVote(e) {
    if (!currentUser) {
        showAlert("Veuillez vous inscrire d'abord", "error");
        return;
    }

    const candidateId = this.getAttribute("data-id");
    const voteRef = doc(db, "votes", candidateId);
    const userRef = doc(db, "users", currentUser.email);

    try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().hasVoted) {
            showAlert("Vous avez déjà voté !", "error");
            return;
        }

        // Animation
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);

        // Enregistrer le vote
        const voteSnap = await getDoc(voteRef);
        const currentCount = voteSnap.exists() ? voteSnap.data().count : 0;
        await setDoc(voteRef, { count: currentCount + 1 });

        await setDoc(userRef, {
            hasVoted: true,
            votedFor: candidateId,
            votedAt: new Date(),
            email: currentUser.email,
            classLevel: currentUser.classLevel
        });

        // Désactiver toutes les cartes
        document.querySelectorAll('.candidate-card').forEach(c => {
            c.style.opacity = '0.6';
            c.style.cursor = 'not-allowed';
            c.classList.remove('card-hover');
        });

        // Afficher confirmation
        voteSection.classList.add("hidden");
        userInfoSection.classList.add("hidden");
        afterVoteSection.classList.remove("hidden");

        showAlert("✅ Vote enregistré avec succès !", "success");

    } catch (error) {
        console.error("Erreur:", error);
        showAlert("❌ Erreur lors du vote. Veuillez réessayer.", "error");
    }
}

// 💫 Fonctions utilitaires
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${type === 'error' ? 'bg-red-500 text-white' :
        type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'} fade-in`;
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function saveUserToLocalStorage(user) {
    localStorage.setItem('currentVotingUser', JSON.stringify(user));
}

// 🔍 Vérification au chargement
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
    setupVoteHandlers();
});

async function checkUserVoteStatus() {
    if (!currentUser) return;

    try {
        const userRef = doc(db, "users", currentUser.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().hasVoted) {
            registerSection.classList.add("hidden");
            afterVoteSection.classList.remove("hidden");
            return;
        }

        registerSection.classList.add("hidden");
        userInfoSection.classList.remove("hidden");
        voteSection.classList.remove("hidden");
        currentUserEmail.textContent = currentUser.email;
        currentUserClass.textContent = currentUser.classLevel;

    } catch (error) {
        console.error("Erreur vérification:", error);
    }
}

console.log("Application de vote initialisée - Version mobile corrigée");