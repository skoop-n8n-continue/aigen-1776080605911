/**
 * GlobalProduce App Logic
 * Syncs with global agricultural prices and simulates real-time volatility.
 */

// --- Data & State ---

const INITIAL_PRODUCE = [
    { id: 'peppers', name: 'Bell Peppers', category: 'Vegetable', basePrice: 3.50, unit: 'kg', trend: 4.2, status: 'Critical', origin: 'Sicily/Spain', color: 'bg-red-100 text-red-700' },
    { id: 'tomatoes', name: 'Vine Tomatoes', category: 'Vegetable', basePrice: 4.50, unit: 'kg', trend: 12.5, status: 'Shortage', origin: 'Italy/Morocco', color: 'bg-orange-100 text-orange-700' },
    { id: 'apples', name: 'Gala Apples', category: 'Fruit', basePrice: 1.85, unit: 'kg', trend: 0.8, status: 'Stable', origin: 'US/Chile', color: 'bg-green-100 text-green-700' },
    { id: 'bananas', name: 'Cavendish Bananas', category: 'Fruit', basePrice: 1.20, unit: 'kg', trend: -0.5, status: 'Stable', origin: 'Ecuador/Costa Rica', color: 'bg-green-100 text-green-700' },
    { id: 'dates', name: 'Medjool Dates', category: 'Fruit', basePrice: 10.50, unit: 'kg', trend: 2.1, status: 'Steady', origin: 'Poland/Israel', color: 'bg-blue-100 text-blue-700' },
    { id: 'potatoes', name: 'Russet Potatoes', category: 'Vegetable', basePrice: 0.85, unit: 'kg', trend: 1.5, status: 'Steady', origin: 'US/Poland', color: 'bg-blue-100 text-blue-700' },
    { id: 'asparagus', name: 'Green Asparagus', category: 'Vegetable', basePrice: 8.75, unit: 'kg', trend: 5.2, status: 'Higher', origin: 'Mexico/Peru', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'strawberries', name: 'Garden Strawberries', category: 'Fruit', basePrice: 5.50, unit: 'kg', trend: -2.3, status: 'Harvest Peak', origin: 'California/Spain', color: 'bg-green-100 text-green-700' },
    { id: 'blueberries', name: 'Highbush Blueberries', category: 'Fruit', basePrice: 8.20, unit: 'kg', trend: 6.8, status: 'Tight Supply', origin: 'Peru/Mexico', color: 'bg-red-100 text-red-700' },
    { id: 'limes', name: 'Tahiti Limes', category: 'Fruit', basePrice: 4.20, unit: 'kg', trend: 8.4, status: 'Elevated', origin: 'Mexico/Brazil', color: 'bg-orange-100 text-orange-700' },
    { id: 'onions', name: 'Yellow Onions', category: 'Vegetable', basePrice: 0.95, unit: 'kg', trend: 0.2, status: 'Stable', origin: 'US/Holland', color: 'bg-green-100 text-green-700' },
    { id: 'grapes', name: 'Green Seedless Grapes', category: 'Fruit', basePrice: 3.80, unit: 'kg', trend: 3.4, status: 'Steady', origin: 'Chile/South Africa', color: 'bg-blue-100 text-blue-700' }
];

let produceData = [...INITIAL_PRODUCE];
let exchangeRates = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 151.2, INR: 83.4 };
let currentCurrency = 'USD';
let chartInstance = null;
let marketHistory = Array.from({ length: 24 }, () => 100 + Math.random() * 20);

// --- Initialization ---

function init() {
    setupCurrencyAPI();
    renderDashboard();
    initChart();
    startPriceEngine();
    setupEventListeners();
}

// --- API Interactions ---

async function setupCurrencyAPI() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (response.ok) {
            const data = await response.json();
            exchangeRates = {
                USD: 1,
                EUR: data.rates.EUR,
                GBP: data.rates.GBP,
                JPY: data.rates.JPY,
                INR: data.rates.INR
            };
            console.log('Exchange rates synced:', exchangeRates);
        }
    } catch (error) {
        console.warn('Failed to fetch real exchange rates, using defaults.', error);
    }
}

// --- UI Rendering ---

function renderDashboard() {
    const tableBody = document.getElementById('priceTableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    tableBody.innerHTML = '';

    const filteredData = produceData.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
    );

    filteredData.forEach(item => {
        const convertedPrice = (item.basePrice * exchangeRates[currentCurrency]).toFixed(2);
        const currencySymbol = getCurrencySymbol(currentCurrency);
        const trendIcon = item.trend >= 0 ? 'trending-up' : 'trending-down';
        const trendColor = item.trend >= 0 ? 'text-green-500' : 'text-red-500';

        const row = document.createElement('tr');
        row.className = 'commodity-row transition group';
        row.onclick = () => openDetails(item.id);

        row.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-primary/20 transition">
                        <i data-lucide="${item.category === 'Fruit' ? 'apple' : 'leaf'}" class="w-5 h-5 text-secondary group-hover:text-primary"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm">${item.name}</div>
                        <div class="text-xs text-gray-400">${item.origin}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="font-mono font-bold">${currencySymbol}${convertedPrice}</div>
                <div class="text-[10px] text-gray-400">per ${item.unit}</div>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="${trendColor} font-bold text-sm flex items-center justify-end">
                    <i data-lucide="${trendIcon}" class="w-3 h-3 mr-1"></i>
                    ${Math.abs(item.trend).toFixed(1)}%
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.color}">${item.status}</span>
            </td>
            <td class="px-6 py-4 text-right">
                <button class="text-primary hover:text-dark text-xs font-bold flex items-center justify-end w-full">
                    DETAILS <i data-lucide="chevron-right" class="w-3 h-3 ml-1"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    lucide.createIcons();
}

function getCurrencySymbol(code) {
    const symbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹' };
    return symbols[code] || '$';
}

function initChart() {
    const ctx = document.getElementById('marketChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 183, 175, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 183, 175, 0)');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Global Produce Index',
                data: marketHistory,
                borderColor: '#00b7af',
                borderWidth: 3,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#00b7af',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#10181f',
                    titleFont: { size: 10 },
                    bodyFont: { size: 12, weight: 'bold' },
                    callbacks: {
                        label: function(context) {
                            return 'Index: ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: { display: false },
                y: {
                    display: true,
                    grid: { color: 'rgba(0,0,0,0.03)' },
                    ticks: { font: { size: 10 }, color: '#6a7071' }
                }
            }
        }
    });
}

// --- Real-Time Engine ---

function startPriceEngine() {
    setInterval(() => {
        // Update individual prices slightly
        produceData = produceData.map(item => {
            const volatility = item.status === 'Critical' ? 0.005 : 0.001;
            const change = (Math.random() - 0.48) * item.basePrice * volatility; // Slight upward bias
            return {
                ...item,
                basePrice: Math.max(0.1, item.basePrice + change)
            };
        });

        // Update market index
        const avgPrice = produceData.reduce((acc, curr) => acc + curr.basePrice, 0) / produceData.length;
        const indexValue = (avgPrice * 10).toFixed(1);
        document.getElementById('marketIndexValue').innerText = indexValue;

        // Update history for chart
        marketHistory.push(parseFloat(indexValue));
        marketHistory.shift();
        if (chartInstance) {
            chartInstance.data.datasets[0].data = marketHistory;
            chartInstance.update('none');
        }

        // Update "Last Update" time
        const now = new Date();
        document.getElementById('lastUpdateTime').innerText = now.toLocaleTimeString();

        // Refresh UI table
        renderDashboard();
    }, 3000); // Update every 3 seconds
}

// --- Interaction Logic ---

function setupEventListeners() {
    document.getElementById('currencySelector').addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        renderDashboard();
    });

    document.getElementById('searchInput').addEventListener('input', () => {
        renderDashboard();
    });

    document.getElementById('closeModal').onclick = () => {
        document.getElementById('modal').classList.add('hidden');
    };

    window.onclick = (event) => {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            modal.classList.add('hidden');
        }
    };
}

function openDetails(id) {
    const item = produceData.find(i => i.id === id);
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    const symbol = getCurrencySymbol(currentCurrency);
    const price = (item.basePrice * exchangeRates[currentCurrency]).toFixed(2);

    content.innerHTML = `
        <div class="p-10">
            <div class="flex items-center space-x-4 mb-6">
                <div class="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                    <i data-lucide="${item.category === 'Fruit' ? 'apple' : 'leaf'}" class="w-8 h-8 text-primary"></i>
                </div>
                <div>
                    <h2 class="text-3xl font-black">${item.name}</h2>
                    <p class="text-secondary font-medium tracking-wide uppercase text-xs">${item.category} • ${item.origin}</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-8">
                <div class="bg-gray-50 p-6 rounded-2xl">
                    <p class="text-xs text-gray-400 mb-1">Current Price</p>
                    <p class="text-3xl font-mono font-black text-dark">${symbol}${price}</p>
                    <p class="text-xs text-gray-400 mt-1">per ${item.unit} wholesale</p>
                </div>
                <div class="bg-gray-50 p-6 rounded-2xl">
                    <p class="text-xs text-gray-400 mb-1">Weekly Trend</p>
                    <p class="text-3xl font-black ${item.trend >= 0 ? 'text-green-500' : 'text-red-500'}">
                        ${item.trend >= 0 ? '+' : ''}${item.trend}%
                    </p>
                    <p class="text-xs text-gray-400 mt-1">Market Sentiment: ${item.trend >= 3 ? 'BULLISH' : (item.trend <= -3 ? 'BEARISH' : 'NEUTRAL')}</p>
                </div>
            </div>

            <div class="mb-8">
                <h4 class="font-bold mb-3 flex items-center"><i data-lucide="info" class="w-4 h-4 mr-2"></i> Supply Chain Insights</h4>
                <div class="space-y-3">
                    <div class="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                        <span class="text-secondary">Primary Export Hubs</span>
                        <span class="font-bold">${item.origin}</span>
                    </div>
                    <div class="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                        <span class="text-secondary">Market Status</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.color}">${item.status}</span>
                    </div>
                    <div class="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                        <span class="text-secondary">Harvest Season</span>
                        <span class="font-bold">April - June</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-secondary">Global Demand Index</span>
                        <span class="font-bold">High (8.4/10)</span>
                    </div>
                </div>
            </div>

            <div class="bg-dark p-6 rounded-2xl">
                <h4 class="text-white font-bold mb-2 flex items-center text-sm">
                    <i data-lucide="zap" class="text-primary w-4 h-4 mr-2"></i> Real-time Alert
                </h4>
                <p class="text-gray-400 text-xs leading-relaxed">
                    Market reports indicate that ${item.name} from ${item.origin.split('/')[0]} is seeing increased volatility due to regional logistics shifts. Procurement teams are advised to lock in forward contracts.
                </p>
            </div>

            <div class="mt-8 flex space-x-3">
                <button class="flex-1 bg-primary py-3 rounded-xl font-bold text-dark hover:bg-opacity-90 transition">Download Dataset</button>
                <button class="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-dark hover:bg-gray-200 transition">Set Alert</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    lucide.createIcons();
}

// Start the app
init();
