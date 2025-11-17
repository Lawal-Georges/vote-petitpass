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
const currentUserName = document.getElementById("current-user-name");
const currentUserMatricule = document.getElementById("current-user-matricule");
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
            labels: ["Violet", "Marron", "Noir", "Vert"],
            datasets: [
                {
                    label: "Nombre de votes",
                    data: [votes.violet, votes.marron, votes.noir, votes.vert],
                    backgroundColor: [

                        "rgba(138, 43, 226, 0.8)",
                        "rgba(139, 69, 19, 0.8)",
                        "rgba(33, 33, 33, 0.8)",
                        "rgba(34, 197, 94, 0.8)"
                    ],
                    borderColor: [

                        "rgb(138, 43, 226)",
                        "rgb(139, 69, 19)",
                        "rgb(33, 33, 33)",
                        "rgb(34, 197, 94)"
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
    if (voteCounts.length >= 4) {

        voteCounts[0].textContent = votes.violet || 0;
        voteCounts[1].textContent = votes.marron || 0;
        voteCounts[2].textContent = votes.noir || 0;
        voteCounts[3].textContent = votes.vert || 0;
    }
}

// 📊 Mettre à jour les barres de progression
function updateProgressBars(votes) {
    try {
        // Calculer le total des votes
        const totalVotes = Object.values(votes).reduce((sum, count) => sum + (count || 0), 0);

        // Fonction pour calculer le pourcentage avec gestion des divisions par zéro
        const calculatePercentage = (voteCount) => {
            if (totalVotes === 0) return 0;
            const percentage = (voteCount / totalVotes) * 100;
            return Math.round(percentage * 10) / 10; // Arrondir à 1 décimale
        };

        // Mettre à jour chaque candidat
        const candidates = [

            { id: 'violet', color: 'bg-purple-600' },
            { id: 'marron', color: 'bg-amber-700' },
            { id: 'noir', color: 'bg-gray-800' },
            { id: 'vert', color: 'bg-green-600' }
        ];

        candidates.forEach(candidate => {
            const voteCount = votes[candidate.id] || 0;
            const percentage = calculatePercentage(voteCount);

            // Mettre à jour le pourcentage
            const percentageElement = document.getElementById(`${candidate.id}-percentage`);
            if (percentageElement) {
                percentageElement.textContent = `${percentage}%`;
                percentageElement.style.color = percentage > 0 ? '#1f2937' : '#6b7280';
            }

            // Mettre à jour la barre de progression
            const progressBar = document.getElementById(`${candidate.id}-progress`);
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
                progressBar.classList.add(candidate.color);

                // Animation fluide
                progressBar.style.transition = 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            }

            // Mettre à jour le nombre de votes
            const votesElement = document.getElementById(`${candidate.id}-votes`);
            if (votesElement) {
                votesElement.textContent = `${voteCount} vote${voteCount !== 1 ? 's' : ''}`;
                votesElement.style.color = voteCount > 0 ? '#374151' : '#9ca3af';
            }
        });

        // Mettre à jour le total des votes dans le titre si nécessaire
        const progressTitle = document.querySelector('.bg-white.rounded-2xl h3');
        if (progressTitle && totalVotes > 0) {
            const originalText = progressTitle.textContent.includes('Progression') ? '🏆 Progression des candidats' : progressTitle.textContent;
            progressTitle.innerHTML = `${originalText} <span class="text-sm font-normal text-gray-500">(${totalVotes} vote${totalVotes !== 1 ? 's' : ''} au total)</span>`;
        }

    } catch (error) {
        console.error('Erreur lors de la mise à jour des barres de progression:', error);
    }
}

// 🔄 Écoute en temps réel des votes
onSnapshot(collection(db, "votes"), (snapshot) => {
    let votes = { noir: 0, violet: 0, marron: 0, vert: 0 };
    snapshot.forEach((doc) => (votes[doc.id] = doc.data().count || 0));

    // Mettre à jour tous les éléments
    initChart(votes);
    updateVoteCounts(votes);
    updateProgressBars(votes);
});

// 👤 Gestion du formulaire d'inscription
userForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userMatricule = document.getElementById("user-matricule").value.trim();
    const userName = document.getElementById("user-name").value.trim();
    const userEmail = document.getElementById("user-email").value.trim().toLowerCase();
    const classLevel = document.getElementById("class-level").value;

    // Validation des champs
    if (!userMatricule || !userName || !userEmail || !classLevel) {
        showAlert("Veuillez remplir tous les champs", "error");
        return;
    }

    if (!isValidEmail(userEmail)) {
        showAlert("Veuillez entrer une adresse email valide", "error");
        return;
    }

    if (!isValidMatricule(userMatricule)) {
        showAlert("Le matricule doit contenir uniquement des lettres et chiffres", "error");
        return;
    }

    try {
        // Vérifier si le matricule a déjà voté
        const matriculeRef = doc(db, "users", userMatricule);
        const matriculeSnap = await getDoc(matriculeRef);

        if (matriculeSnap.exists() && matriculeSnap.data().hasVoted) {
            showAlert("Ce matricule a déjà voté !", "error");
            return;
        }

        // Vérifier si l'email a déjà voté
        const emailRef = doc(db, "users_by_email", userEmail);
        const emailSnap = await getDoc(emailRef);

        if (emailSnap.exists() && emailSnap.data().hasVoted) {
            showAlert("Cette adresse email a déjà voté !", "error");
            return;
        }

        currentUser = {
            matricule: userMatricule,
            name: userName,
            email: userEmail,
            classLevel: classLevel
        };

        saveUserToLocalStorage(currentUser);

        registerSection.classList.add("hidden");
        userInfoSection.classList.remove("hidden");
        voteSection.classList.remove("hidden");

        currentUserName.textContent = currentUser.name;
        currentUserMatricule.textContent = currentUser.matricule;
        currentUserClass.textContent = classLevel;

        showAlert(`Bienvenue ${userName} ! Vous pouvez maintenant voter.`, "success");

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
    // Nettoyer les anciens événements
    candidateCards.forEach((card) => {
        card.replaceWith(card.cloneNode(true));
    });

    // Re-sélectionner les cartes après clonage
    const newCandidateCards = document.querySelectorAll(".candidate-card");

    newCandidateCards.forEach((card) => {
        // 🎯 Sélectionne uniquement l'icône circulaire
        const iconZone = card.querySelector(".w-10.h-10");

        if (iconZone) {
            // Changer le curseur pour montrer que c'est cliquable
            iconZone.style.cursor = "pointer";

            // ✅ Clique sur l'icône = vote
            iconZone.addEventListener("click", (e) => {
                e.stopPropagation(); // Empêche de cliquer ailleurs
                handleVote.call(card, e);
            });

            // 📱 Support du toucher mobile
            iconZone.addEventListener("touchstart", function () {
                if (isMobile()) {
                    this.style.transform = "scale(0.9)";
                    this.style.opacity = "0.8";
                }
            });

            iconZone.addEventListener("touchend", function (e) {
                if (isMobile()) {
                    e.preventDefault();
                    this.style.transform = "scale(1)";
                    this.style.opacity = "1";
                    handleVote.call(card, e);
                }
            });
        }
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
    const userRef = doc(db, "users", currentUser.matricule);
    const emailRef = doc(db, "users_by_email", currentUser.email);

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

        // Enregistrer l'utilisateur avec le matricule comme ID
        await setDoc(userRef, {
            hasVoted: true,
            votedFor: candidateId,
            votedAt: new Date(),
            matricule: currentUser.matricule,
            name: currentUser.name,
            email: currentUser.email,
            classLevel: currentUser.classLevel
        });

        // Enregistrer également avec l'email comme référence
        await setDoc(emailRef, {
            hasVoted: true,
            votedFor: candidateId,
            votedAt: new Date(),
            matricule: currentUser.matricule,
            name: currentUser.name
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

function isValidMatricule(matricule) {
    return /^[a-zA-Z0-9]+$/.test(matricule);
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

    // Initialiser les barres de progression à zéro
    updateProgressBars({ violet: 0, marron: 0, noir: 0, vert: 0 });
});

async function checkUserVoteStatus() {
    if (!currentUser) return;

    try {
        const userRef = doc(db, "users", currentUser.matricule);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().hasVoted) {
            registerSection.classList.add("hidden");
            afterVoteSection.classList.remove("hidden");
            return;
        }

        registerSection.classList.add("hidden");
        userInfoSection.classList.remove("hidden");
        voteSection.classList.remove("hidden");
        currentUserName.textContent = currentUser.name;
        currentUserMatricule.textContent = currentUser.matricule;
        currentUserClass.textContent = currentUser.classLevel;

    } catch (error) {
        console.error("Erreur vérification:", error);
    }
}

console.log("Application de vote initialisée - Version avec barres de progression");