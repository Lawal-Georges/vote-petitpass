// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    collection,
    getDocs,
    deleteDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCGb1pM85RNcIM3C39XYtxG-BTJlGmElOg",
    authDomain: "vote-petit.firebaseapp.com",
    projectId: "vote-petit",
    storageBucket: "vote-petit.firebasestorage.app",
    messagingSenderId: "333446829341",
    appId: "1:333446829341:web:ca47a9833181806c09bdf4",
    measurementId: "G-R75YYCWK1C"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configuration admin - REMPLACEZ par votre email
const ADMIN_EMAILS = ['eyumgeorges@gmail.com']; // Ajoutez d'autres emails si besoin
const ADMIN_PASSWORD = 'boss123'; // À changer

// Éléments DOM
const adminLoginSection = document.getElementById('admin-login-section');
const adminPanel = document.getElementById('admin-panel');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLogoutBtn = document.getElementById('admin-logout');
const adminEmailInput = document.getElementById('admin-email-input');
const adminPasswordInput = document.getElementById('admin-password-input');
const adminError = document.getElementById('admin-error');
const adminUser = document.getElementById('admin-user');
const adminEmailDisplay = document.getElementById('admin-email');

// Nouveaux éléments pour le panel admin
const adminUserPanel = document.getElementById('admin-user-panel');
const adminEmailPanel = document.getElementById('admin-email-panel');
const adminLogoutPanel = document.getElementById('admin-logout-panel');

let adminChart;
let currentVotes = { noir: 0, violet: 0, marron: 0, vert: 0 };

// ==================== FONCTIONS RESPONSIVES AJOUTÉES ====================

// Détection mobile
function isMobile() {
    return window.innerWidth <= 768;
}

// Ajustement automatique pour mobile
function adjustForMobile() {
    const isMobileView = isMobile();

    if (isMobileView) {
        document.body.classList.add('mobile-mode');
        // Ajustements spécifiques mobile
        const chartCanvas = document.getElementById('admin-chart');
        if (chartCanvas) {
            const parent = chartCanvas.parentElement;
            if (parent) {
                parent.style.height = '300px';
            }
        }
    } else {
        document.body.classList.remove('mobile-mode');
    }
}

// Fonction pour réappliquer les styles responsives après la connexion
function reapplyResponsiveStyles() {
    // Réinitialiser le graphique
    if (adminChart) {
        setTimeout(() => {
            adminChart.resize();
        }, 100);
    }

    // Forcer le recalcul des styles
    setTimeout(() => {
        adjustForMobile();

        // Réappliquer les classes responsives sur les éléments dynamiques
        const votersList = document.getElementById('voters-list');
        if (votersList) {
            const rows = votersList.querySelectorAll('tr');
            rows.forEach(row => {
                if (!row.classList.contains('fade-in')) {
                    row.classList.add('fade-in');
                }
            });
        }
    }, 150);
}

// Initialisation des écouteurs responsives
function initResponsiveListeners() {
    // Écouter le redimensionnement
    window.addEventListener('resize', function () {
        adjustForMobile();
        reapplyResponsiveStyles();
    });

    // Surveiller les changements de visibilité du panel admin
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (!mutation.target.classList.contains('hidden')) {
                    // Le panel admin est visible, réappliquer les styles
                    setTimeout(reapplyResponsiveStyles, 50);
                }
            }
        });
    });

    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        observer.observe(adminPanel, { attributes: true });
    }
}

// ==================== FONCTIONS EXISTANTES MODIFIÉES ====================

// Vérification des identifiants admin
function isAdmin(email, password) {
    return ADMIN_EMAILS.includes(email.toLowerCase()) && password === ADMIN_PASSWORD;
}

// Connexion admin - MODIFIÉE POUR INCLURE LE RESPONSIVE
adminLoginBtn.addEventListener('click', async () => {
    const email = adminEmailInput.value;
    const password = adminPasswordInput.value;

    if (!email || !password) {
        showError('Veuillez remplir tous les champs');
        return;
    }

    if (!isAdmin(email, password)) {
        showError('Accès non autorisé. Identifiants incorrects.');
        return;
    }

    try {
        // Simuler une connexion (vous pouvez utiliser Firebase Auth si vous voulez)
        adminLoginSection.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        adminUser.classList.remove('hidden');
        adminUserPanel.classList.remove('hidden'); // Nouveau
        adminEmailDisplay.textContent = email;
        adminEmailPanel.textContent = email; // Nouveau

        // Charger les données
        loadAdminData();

        // Réappliquer les styles responsives après la connexion
        setTimeout(() => {
            reapplyResponsiveStyles();
            // Forcer un redimensionnement
            window.dispatchEvent(new Event('resize'));
        }, 200);

    } catch (error) {
        showError('Erreur de connexion: ' + error.message);
    }
});

// Déconnexion admin (bouton dans l'en-tête)
adminLogoutBtn.addEventListener('click', () => {
    adminPanel.classList.add('hidden');
    adminLoginSection.classList.remove('hidden');
    adminUser.classList.add('hidden');
    adminUserPanel.classList.add('hidden'); // Nouveau
    adminEmailInput.value = '';
    adminPasswordInput.value = '';
});

// Déconnexion admin (bouton dans le panel)
adminLogoutPanel.addEventListener('click', () => {
    adminPanel.classList.add('hidden');
    adminLoginSection.classList.remove('hidden');
    adminUser.classList.add('hidden');
    adminUserPanel.classList.add('hidden');
    adminEmailInput.value = '';
    adminPasswordInput.value = '';
});

// Afficher les erreurs
function showError(message) {
    adminError.textContent = message;
    adminError.classList.remove('hidden');
    setTimeout(() => {
        adminError.classList.add('hidden');
    }, 5000);
}

// Charger les données admin - MODIFIÉE POUR LE RESPONSIVE
function loadAdminData() {
    // Écouter les votes en temps réel
    onSnapshot(collection(db, "votes"), (snapshot) => {
        snapshot.forEach((doc) => {
            currentVotes[doc.id] = doc.data().count || 0;
        });
        updateAdminUI();
        initAdminChart();

        // Réappliquer les styles après le chargement des données
        setTimeout(reapplyResponsiveStyles, 100);
    });

    // Charger la liste des votants
    loadVotersList();

    // Configurer les contrôles de votes
    setupVoteControls();
}

// Mettre à jour l'interface admin
function updateAdminUI() {
    document.getElementById('noir-count').textContent = currentVotes.noir;
    document.getElementById('violet-count').textContent = currentVotes.violet;
    document.getElementById('marron-count').textContent = currentVotes.marron;
    document.getElementById('vert-count').textContent = currentVotes.vert;

    document.getElementById('noir-input').value = currentVotes.noir;
    document.getElementById('violet-input').value = currentVotes.violet;
    document.getElementById('marron-input').value = currentVotes.marron;
    document.getElementById('vert-input').value = currentVotes.vert;
}

// Initialiser le graphique admin - AMÉLIORÉE POUR LE RESPONSIVE
function initAdminChart() {
    const ctx = document.getElementById('admin-chart').getContext('2d');
    if (adminChart) adminChart.destroy();

    // Ajuster la hauteur du conteneur parent pour mobile
    const chartContainer = document.getElementById('admin-chart').parentElement;
    if (isMobile() && chartContainer) {
        chartContainer.style.height = '300px';
    }

    adminChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Noir', 'Violet', 'Marron', 'Vert'],
            datasets: [{
                label: 'Votes',
                data: [currentVotes.noir, currentVotes.violet, currentVotes.marron, currentVotes.vert],
                backgroundColor: [
                    'rgba(33, 33, 33, 0.8)',
                    'rgba(138, 43, 226, 0.8)',
                    'rgba(139, 69, 19, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    'rgb(33, 33, 33)',
                    'rgb(138, 43, 226)',
                    'rgb(139, 69, 19)',
                    'rgb(34, 197, 94)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Répartition des votes',
                    font: {
                        size: isMobile() ? 14 : 16
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: isMobile() ? 10 : 12
                        }
                    }
                }
            }
        }
    });

    // Redimensionner après création
    setTimeout(() => {
        adminChart.resize();
    }, 50);
}

// Configurer les contrôles de votes
function setupVoteControls() {
    document.querySelectorAll('.vote-control').forEach(button => {
        button.addEventListener('click', (e) => {
            const candidate = e.target.closest('button').dataset.candidate;
            const action = e.target.closest('button').dataset.action;
            const input = document.getElementById(`${candidate}-input`);
            let value = parseInt(input.value);

            if (action === 'increase') {
                value++;
            } else if (action === 'decrease' && value > 0) {
                value--;
            }

            input.value = value;
        });
    });

    // Écouter les changements manuels dans les inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('change', (e) => {
            let value = parseInt(e.target.value);
            if (value < 0) {
                e.target.value = 0;
            }
        });
    });
}

// Sauvegarder les modifications
document.getElementById('save-votes').addEventListener('click', async () => {
    try {
        const newVotes = {
            noir: parseInt(document.getElementById('noir-input').value),
            violet: parseInt(document.getElementById('violet-input').value),
            marron: parseInt(document.getElementById('marron-input').value),
            vert: parseInt(document.getElementById('vert-input').value)
        };

        // Validation
        for (const [candidate, count] of Object.entries(newVotes)) {
            if (isNaN(count) || count < 0) {
                showCustomAlert('Veuillez entrer des valeurs valides pour tous les candidats', 'error');
                return;
            }
        }

        // Mettre à jour Firebase
        for (const [candidate, count] of Object.entries(newVotes)) {
            const voteRef = doc(db, "votes", candidate);
            await setDoc(voteRef, { count: count });
        }

        showCustomAlert('✅ Votes sauvegardés avec succès!', 'success');
    } catch (error) {
        showCustomAlert('❌ Erreur lors de la sauvegarde: ' + error.message, 'error');
    }
});

// Réinitialiser tous les votes
document.getElementById('reset-all').addEventListener('click', async () => {
    if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser tous les votes ? Cette action est irréversible.')) {
        try {
            // Réinitialiser les votes
            const candidates = ['noir', 'violet', 'marron', 'vert'];
            for (const candidate of candidates) {
                const voteRef = doc(db, "votes", candidate);
                await setDoc(voteRef, { count: 0 });
            }

            // Supprimer tous les utilisateurs ayant voté (collection users)
            const usersSnapshot = await getDocs(collection(db, "users"));
            const deletePromises = [];
            usersSnapshot.forEach((userDoc) => {
                deletePromises.push(deleteDoc(userDoc.ref));
            });

            // Supprimer tous les utilisateurs ayant voté (collection users_by_email)
            const usersByEmailSnapshot = await getDocs(collection(db, "users_by_email"));
            usersByEmailSnapshot.forEach((userDoc) => {
                deletePromises.push(deleteDoc(userDoc.ref));
            });

            await Promise.all(deletePromises);

            showCustomAlert('✅ Tous les votes et utilisateurs ont été réinitialisés!', 'success');
        } catch (error) {
            showCustomAlert('❌ Erreur lors de la réinitialisation: ' + error.message, 'error');
        }
    }
});

// Charger la liste des votants - AMÉLIORÉE POUR LE RESPONSIVE
async function loadVotersList() {
    const votersList = document.getElementById('voters-list');

    onSnapshot(collection(db, "users"), (snapshot) => {
        votersList.innerHTML = '';

        if (snapshot.empty) {
            votersList.innerHTML = `
                <tr>
                    <td colspan="7" class="px-4 py-8 text-center text-gray-500 text-sm">
                        <i class="fas fa-users text-3xl mb-2 text-gray-300"></i>
                        <p>Aucun utilisateur n'a voté pour le moment</p>
                    </td>
                </tr>
            `;
            return;
        }

        snapshot.forEach((doc) => {
            const userData = doc.data();
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50 fade-in';

            const votedAt = userData.votedAt ? new Date(userData.votedAt.seconds * 1000).toLocaleString() : 'Inconnue';

            // Déterminer la classe CSS en fonction du candidat
            let candidateClass = '';
            let candidateText = '';
            switch (userData.votedFor) {
                case 'noir':
                    candidateClass = 'bg-gray-100 text-gray-800';
                    candidateText = 'Noir';
                    break;
                case 'violet':
                    candidateClass = 'bg-purple-100 text-purple-800';
                    candidateText = 'Violet';
                    break;
                case 'marron':
                    candidateClass = 'bg-amber-100 text-amber-800';
                    candidateText = 'Marron';
                    break;
                case 'vert':
                    candidateClass = 'bg-green-100 text-green-800';
                    candidateText = 'Vert';
                    break;
                default:
                    candidateClass = 'bg-gray-100 text-gray-800';
                    candidateText = userData.votedFor || 'Inconnu';
            }

            // Utiliser des classes responsives pour le tableau
            row.innerHTML = `
                <td class="px-2 py-2 sm:px-4 sm:py-3 font-mono text-xs sm:text-sm font-medium whitespace-nowrap">${doc.id}</td>
                <td class="px-2 py-2 sm:px-4 sm:py-3 font-medium text-xs sm:text-sm mobile-hidden sm:table-cell">${userData.name || 'Non renseigné'}</td>
                <td class="px-2 py-2 sm:px-4 sm:py-3 text-blue-600 text-xs sm:text-sm mobile-hidden lg:table-cell">${userData.email || 'Non renseigné'}</td>
                <td class="px-2 py-2 sm:px-4 sm:py-3">
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium whitespace-nowrap">
                        ${userData.classLevel || 'Non renseigné'}
                    </span>
                </td>
                <td class="px-2 py-2 sm:px-4 sm:py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${candidateClass} whitespace-nowrap">
                        ${candidateText}
                    </span>
                </td>
                <td class="px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-600 mobile-hidden md:table-cell">${votedAt}</td>
                <td class="px-2 py-2 sm:px-4 sm:py-3">
                    <button class="delete-voter text-red-600 hover:text-red-800 transition-colors p-1 sm:p-2 rounded-lg hover:bg-red-50 touch-target" 
                            data-matricule="${doc.id}" data-email="${userData.email}" title="Supprimer ce vote">
                        <i class="fas fa-trash text-xs sm:text-sm"></i>
                    </button>
                </td>
            `;

            votersList.appendChild(row);
        });

        // Ajouter les événements de suppression
        document.querySelectorAll('.delete-voter').forEach(button => {
            button.addEventListener('click', async (e) => {
                const matricule = e.target.closest('button').dataset.matricule;
                const email = e.target.closest('button').dataset.email;

                if (confirm(`Supprimer le vote de ${matricule} (${email}) ? Cette action est irréversible.`)) {
                    try {
                        // Supprimer de la collection users (par matricule)
                        await deleteDoc(doc(db, "users", matricule));

                        // Supprimer de la collection users_by_email (par email)
                        if (email && email !== 'Non renseigné') {
                            await deleteDoc(doc(db, "users_by_email", email));
                        }

                        showCustomAlert(`✅ Vote de ${matricule} supprimé avec succès!`, 'success');
                    } catch (error) {
                        showCustomAlert('❌ Erreur lors de la suppression: ' + error.message, 'error');
                    }
                }
            });
        });

        // Réappliquer les styles après le chargement de la liste
        setTimeout(reapplyResponsiveStyles, 50);
    });
}

// Raccourcis clavier pour l'admin
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        document.getElementById('save-votes').click();
    }
});

// Fonction pour afficher des alertes stylisées
function showCustomAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${type === 'error' ? 'bg-red-500 text-white' :
        type === 'success' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'} fade-in`;
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} mr-2"></i>
            <span class="text-sm">${message}</span>
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

// ==================== INITIALISATION ====================

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Panel admin initialisé avec les couleurs: Noir, Violet, Marron, Vert');

    // Initialiser les écouteurs responsives
    initResponsiveListeners();

    // Ajuster immédiatement pour la taille actuelle
    adjustForMobile();
});

// Amélioration du touch sur mobile
document.addEventListener('touchstart', function () { }, { passive: true });

console.log('Panel admin initialisé avec support responsive complet');