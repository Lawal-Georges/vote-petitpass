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
let currentVotes = { violet: 0, marron: 0, jaune: 0 };

// Vérification des identifiants admin
function isAdmin(email, password) {
    return ADMIN_EMAILS.includes(email.toLowerCase()) && password === ADMIN_PASSWORD;
}

// Connexion admin
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

// Charger les données admin
function loadAdminData() {
    // Écouter les votes en temps réel
    onSnapshot(collection(db, "votes"), (snapshot) => {
        snapshot.forEach((doc) => {
            currentVotes[doc.id] = doc.data().count || 0;
        });
        updateAdminUI();
        initAdminChart();
    });

    // Charger la liste des votants
    loadVotersList();
}

// Mettre à jour l'interface admin
function updateAdminUI() {
    document.getElementById('violet-count').textContent = currentVotes.violet;
    document.getElementById('marron-count').textContent = currentVotes.marron;
    document.getElementById('jaune-count').textContent = currentVotes.jaune;

    document.getElementById('violet-input').value = currentVotes.violet;
    document.getElementById('marron-input').value = currentVotes.marron;
    document.getElementById('jaune-input').value = currentVotes.jaune;
}

// Initialiser le graphique admin
function initAdminChart() {
    const ctx = document.getElementById('admin-chart').getContext('2d');
    if (adminChart) adminChart.destroy();

    adminChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Violet', 'Marron', 'Jaune'],
            datasets: [{
                label: 'Votes',
                data: [currentVotes.violet, currentVotes.marron, currentVotes.jaune],
                backgroundColor: [
                    'rgba(138, 43, 226, 0.8)',
                    'rgba(139, 69, 19, 0.8)',
                    'rgba(255, 215, 0, 0.8)'
                ],
                borderColor: [
                    'rgb(138, 43, 226)',
                    'rgb(139, 69, 19)',
                    'rgb(255, 215, 0)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Répartition des votes' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Contrôles des votes
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

// Sauvegarder les modifications
document.getElementById('save-votes').addEventListener('click', async () => {
    try {
        const newVotes = {
            violet: parseInt(document.getElementById('violet-input').value),
            marron: parseInt(document.getElementById('marron-input').value),
            jaune: parseInt(document.getElementById('jaune-input').value)
        };

        // Mettre à jour Firebase
        for (const [candidate, count] of Object.entries(newVotes)) {
            const voteRef = doc(db, "votes", candidate);
            await setDoc(voteRef, { count: count });
        }

        alert('✅ Votes sauvegardés avec succès!');
    } catch (error) {
        alert('❌ Erreur lors de la sauvegarde: ' + error.message);
    }
});

// Réinitialiser tous les votes
document.getElementById('reset-all').addEventListener('click', async () => {
    if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser tous les votes ? Cette action est irréversible.')) {
        try {
            // Réinitialiser les votes
            const candidates = ['violet', 'marron', 'jaune'];
            for (const candidate of candidates) {
                const voteRef = doc(db, "votes", candidate);
                await setDoc(voteRef, { count: 0 });
            }

            // Supprimer tous les utilisateurs ayant voté
            const usersSnapshot = await getDocs(collection(db, "users"));
            const deletePromises = [];
            usersSnapshot.forEach((userDoc) => {
                deletePromises.push(deleteDoc(userDoc.ref));
            });

            await Promise.all(deletePromises);

            alert('✅ Tous les votes et utilisateurs ont été réinitialisés!');
        } catch (error) {
            alert('❌ Erreur lors de la réinitialisation: ' + error.message);
        }
    }
});

// Charger la liste des votants
async function loadVotersList() {
    const votersList = document.getElementById('voters-list');

    onSnapshot(collection(db, "users"), (snapshot) => {
        votersList.innerHTML = '';

        snapshot.forEach((doc) => {
            const userData = doc.data();
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';

            const votedAt = userData.votedAt ? new Date(userData.votedAt.seconds * 1000).toLocaleString() : 'Inconnue';

            row.innerHTML = `
                <td class="px-4 py-3 font-medium">${doc.id}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium 
                        ${userData.votedFor === 'violet' ? 'bg-purple-100 text-purple-800' :
                    userData.votedFor === 'marron' ? 'bg-amber-100 text-amber-800' :
                        'bg-yellow-100 text-yellow-800'}">
                        ${userData.votedFor}
                    </span>
                </td>
                <td class="px-4 py-3">${votedAt}</td>
                <td class="px-4 py-3">
                    <button class="delete-voter text-red-600 hover:text-red-800" data-email="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            votersList.appendChild(row);
        });

        // Ajouter les événements de suppression
        document.querySelectorAll('.delete-voter').forEach(button => {
            button.addEventListener('click', async (e) => {
                const email = e.target.closest('button').dataset.email;
                if (confirm(`Supprimer le vote de ${email} ?`)) {
                    await deleteDoc(doc(db, "users", email));
                }
            });
        });
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

console.log('Panel admin initialisé avec bouton retour');