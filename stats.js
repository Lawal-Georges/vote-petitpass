// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    collection,
    getDocs,
    query,
    orderBy
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
const db = getFirestore(app);

// Variables globales
let statsChart;
let allVoters = [];
let filteredVoters = [];
let currentPage = 1;
const votersPerPage = 10;

// Éléments DOM
const refreshStatsBtn = document.getElementById('refresh-stats');
const exportDataBtn = document.getElementById('export-data');
const searchVotersInput = document.getElementById('search-voters');
const filterClassSelect = document.getElementById('filter-class');
const filterCandidateSelect = document.getElementById('filter-candidate');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageSpan = document.getElementById('current-page');

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function () {
    loadAllData();
    setupEventListeners();
});

// Charger toutes les données
function loadAllData() {
    loadVotesData();
    loadVotersData();
    updateLastUpdateTime();
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    refreshStatsBtn.addEventListener('click', loadAllData);
    exportDataBtn.addEventListener('click', exportData);
    searchVotersInput.addEventListener('input', filterVoters);
    filterClassSelect.addEventListener('change', filterVoters);
    filterCandidateSelect.addEventListener('change', filterVoters);
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
}

// Charger les données des votes
function loadVotesData() {
    onSnapshot(collection(db, "votes"), (snapshot) => {
        const votes = { noir: 0, violet: 0, marron: 0, vert: 0 };
        let totalVotes = 0;

        snapshot.forEach((doc) => {
            votes[doc.id] = doc.data().count || 0;
            totalVotes += votes[doc.id];
        });

        updateVotesDisplay(votes, totalVotes);
        updateProgressBars(votes, totalVotes);
        updateLeadingCandidate(votes);
    });
}

// Charger les données des votants
function loadVotersData() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        allVoters = [];
        snapshot.forEach((doc) => {
            const voterData = doc.data();
            allVoters.push({
                matricule: doc.id,
                name: voterData.name || 'Non renseigné',
                email: voterData.email || 'Non renseigné',
                classLevel: voterData.classLevel || 'Non renseigné',
                votedFor: voterData.votedFor || 'Inconnu',
                votedAt: voterData.votedAt ? new Date(voterData.votedAt.seconds * 1000) : new Date()
            });
        });

        // Trier par date de vote (plus récent en premier)
        allVoters.sort((a, b) => b.votedAt - a.votedAt);

        updateVotersMetrics();
        filterVoters();
        updateClassStats();
    });
}

// Mettre à jour l'affichage des votes
function updateVotesDisplay(votes, totalVotes) {
    document.getElementById('total-voters').textContent = totalVotes;

    // Calculer les pourcentages
    const percentages = {};
    Object.keys(votes).forEach(candidate => {
        percentages[candidate] = totalVotes > 0 ? ((votes[candidate] / totalVotes) * 100).toFixed(1) : 0;
    });

    // Mettre à jour les pourcentages affichés
    document.getElementById('noir-percentage').textContent = `${percentages.noir}%`;
    document.getElementById('violet-percentage').textContent = `${percentages.violet}%`;
    document.getElementById('marron-percentage').textContent = `${percentages.marron}%`;
    document.getElementById('vert-percentage').textContent = `${percentages.vert}%`;

    // Mettre à jour les votes affichés
    document.getElementById('noir-votes').textContent = `${votes.noir} votes`;
    document.getElementById('violet-votes').textContent = `${votes.violet} votes`;
    document.getElementById('marron-votes').textContent = `${votes.marron} votes`;
    document.getElementById('vert-votes').textContent = `${votes.vert} votes`;

    // Mettre à jour le graphique
    updateChart(votes, percentages);
}

// Mettre à jour les barres de progression
function updateProgressBars(votes, totalVotes) {
    Object.keys(votes).forEach(candidate => {
        const percentage = totalVotes > 0 ? (votes[candidate] / totalVotes) * 100 : 0;
        const progressBar = document.getElementById(`${candidate}-progress`);
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    });
}

// Mettre à jour le candidat en tête
function updateLeadingCandidate(votes) {
    let leadingCandidate = '';
    let maxVotes = 0;

    Object.keys(votes).forEach(candidate => {
        if (votes[candidate] > maxVotes) {
            maxVotes = votes[candidate];
            leadingCandidate = candidate;
        }
    });

    const candidateNames = {
        noir: 'Noir',
        violet: 'Violet',
        marron: 'Marron',
        vert: 'Vert'
    };

    document.getElementById('leading-candidate').textContent = candidateNames[leadingCandidate] || '-';
    document.getElementById('leading-votes').textContent = `${maxVotes} votes`;
}

// Mettre à jour les métriques des votants
function updateVotersMetrics() {
    const totalVoters = allVoters.length;
    document.getElementById('total-voters-count').textContent = totalVoters;

    // Calculer le taux de participation (exemple: basé sur 100 inscrits potentiels)
    const potentialVoters = 100; // À ajuster selon vos besoins
    const participationRate = ((totalVoters / potentialVoters) * 100).toFixed(1);
    document.getElementById('participation-rate').textContent = `${participationRate}%`;

    // Dernier vote
    if (allVoters.length > 0) {
        const lastVote = allVoters[0].votedAt;
        document.getElementById('last-vote-time').textContent = lastVote.toLocaleString('fr-FR');
    }
}

// Mettre à jour les statistiques par classe
function updateClassStats() {
    const classStats = {
        L1: { total: 0, votes: { noir: 0, violet: 0, marron: 0, vert: 0 } },
        L2: { total: 0, votes: { noir: 0, violet: 0, marron: 0, vert: 0 } },
        L3: { total: 0, votes: { noir: 0, violet: 0, marron: 0, vert: 0 } },
        L4: { total: 0, votes: { noir: 0, violet: 0, marron: 0, vert: 0 } },
        L5: { total: 0, votes: { noir: 0, violet: 0, marron: 0, vert: 0 } }
    };

    allVoters.forEach(voter => {
        if (classStats[voter.classLevel]) {
            classStats[voter.classLevel].total++;
            if (classStats[voter.classLevel].votes[voter.votedFor] !== undefined) {
                classStats[voter.classLevel].votes[voter.votedFor]++;
            }
        }
    });

    const classStatsContainer = document.getElementById('class-stats');
    classStatsContainer.innerHTML = '';

    Object.keys(classStats).forEach(className => {
        const stats = classStats[className];
        if (stats.total > 0) {
            const classElement = document.createElement('div');
            classElement.className = 'bg-gray-50 rounded-lg p-4';

            const leadingCandidate = Object.keys(stats.votes).reduce((a, b) =>
                stats.votes[a] > stats.votes[b] ? a : b
            );

            const candidateNames = {
                noir: 'Noir',
                violet: 'Violet',
                marron: 'Marron',
                vert: 'Vert'
            };

            classElement.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="font-semibold text-gray-800">${className}</span>
                    <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${stats.total} votes</span>
                </div>
                <div class="text-sm text-gray-600">
                    Préfère : <span class="font-medium">${candidateNames[leadingCandidate]}</span>
                </div>
                <div class="mt-2 grid grid-cols-4 gap-1">
                    ${Object.keys(stats.votes).map(candidate => `
                        <div class="text-center">
                            <div class="text-xs font-medium ${getCandidateColorClass(candidate)}">${stats.votes[candidate]}</div>
                        </div>
                    `).join('')}
                </div>
            `;

            classStatsContainer.appendChild(classElement);
        }
    });

    if (classStatsContainer.children.length === 0) {
        classStatsContainer.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <i class="fas fa-chart-pie text-2xl mb-2"></i>
                <p>Aucune donnée de classe disponible</p>
            </div>
        `;
    }
}

// Filtrer les votants
function filterVoters() {
    const searchTerm = searchVotersInput.value.toLowerCase();
    const selectedClass = filterClassSelect.value;
    const selectedCandidate = filterCandidateSelect.value;

    filteredVoters = allVoters.filter(voter => {
        const matchesSearch =
            voter.matricule.toLowerCase().includes(searchTerm) ||
            voter.name.toLowerCase().includes(searchTerm) ||
            voter.email.toLowerCase().includes(searchTerm);

        const matchesClass = !selectedClass || voter.classLevel === selectedClass;
        const matchesCandidate = !selectedCandidate || voter.votedFor === selectedCandidate;

        return matchesSearch && matchesClass && matchesCandidate;
    });

    currentPage = 1;
    displayVotersPage();
}

// Afficher la page courante des votants
function displayVotersPage() {
    const startIndex = (currentPage - 1) * votersPerPage;
    const endIndex = startIndex + votersPerPage;
    const pageVoters = filteredVoters.slice(startIndex, endIndex);

    const votersList = document.getElementById('detailed-voters-list');
    votersList.innerHTML = '';

    if (pageVoters.length === 0) {
        votersList.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-search text-3xl mb-2 text-gray-300"></i>
                    <p>Aucun votant ne correspond aux critères de recherche</p>
                </td>
            </tr>
        `;
        return;
    }

    pageVoters.forEach(voter => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-gray-50 fade-in';

        row.innerHTML = `
            <td class="px-4 py-3 font-mono text-sm">${voter.matricule}</td>
            <td class="px-4 py-3 font-medium">${voter.name}</td>
            <td class="px-4 py-3 text-blue-600">${voter.email}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    ${voter.classLevel}
                </span>
            </td>
            <td class="px-4 py-3">
                <span class="px-3 py-1 rounded-full text-xs font-medium ${getCandidateBadgeClass(voter.votedFor)}">
                    ${getCandidateName(voter.votedFor)}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-600">${voter.votedAt.toLocaleString('fr-FR')}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Validé
                </span>
            </td>
        `;

        votersList.appendChild(row);
    });

    // Mettre à jour la pagination
    updatePagination();
}

// Mettre à jour la pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredVoters.length / votersPerPage);
    const startIndex = (currentPage - 1) * votersPerPage + 1;
    const endIndex = Math.min(currentPage * votersPerPage, filteredVoters.length);

    document.getElementById('start-index').textContent = startIndex;
    document.getElementById('end-index').textContent = endIndex;
    document.getElementById('total-voters-count').textContent = filteredVoters.length;

    currentPageSpan.textContent = currentPage;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Navigation entre les pages
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayVotersPage();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(filteredVoters.length / votersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayVotersPage();
    }
}

// Mettre à jour le graphique
function updateChart(votes, percentages) {
    const ctx = document.getElementById('votes-chart').getContext('2d');

    if (statsChart) {
        statsChart.destroy();
    }

    statsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Noir', 'Violet', 'Marron', 'Vert'],
            datasets: [{
                data: [votes.noir, votes.violet, votes.marron, votes.vert],
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
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = percentages[context.label.toLowerCase()];
                            return `${label}: ${value} votes (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

// Exporter les données
function exportData() {
    const data = {
        timestamp: new Date().toISOString(),
        totalVoters: allVoters.length,
        voters: allVoters,
        summary: {
            noir: document.getElementById('noir-votes').textContent,
            violet: document.getElementById('violet-votes').textContent,
            marron: document.getElementById('marron-votes').textContent,
            vert: document.getElementById('vert-votes').textContent
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques-vote-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('✅ Données exportées avec succès!', 'success');
}

// Mettre à jour l'heure de dernière mise à jour
function updateLastUpdateTime() {
    document.getElementById('last-update').textContent = new Date().toLocaleString('fr-FR');
}

// Fonctions utilitaires
function getCandidateName(candidate) {
    const names = {
        noir: 'Noir',
        violet: 'Violet',
        marron: 'Marron',
        vert: 'Vert'
    };
    return names[candidate] || candidate;
}

function getCandidateBadgeClass(candidate) {
    const classes = {
        noir: 'bg-gray-100 text-gray-800',
        violet: 'bg-purple-100 text-purple-800',
        marron: 'bg-amber-100 text-amber-800',
        vert: 'bg-green-100 text-green-800'
    };
    return classes[candidate] || 'bg-gray-100 text-gray-800';
}

function getCandidateColorClass(candidate) {
    const classes = {
        noir: 'text-gray-700',
        violet: 'text-purple-700',
        marron: 'text-amber-700',
        vert: 'text-green-700'
    };
    return classes[candidate] || 'text-gray-700';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${type === 'error' ? 'bg-red-500 text-white' :
        type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'} fade-in`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 4000);
}

console.log('Page de statistiques initialisée');