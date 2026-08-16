// ==================================================
// CONFIGURATION
// ==================================================

// 1. Enter your WhatsApp number (Include country code, no + or spaces)
const WHATSAPP_NUMBER = "919876543211"; // Example: 91 for India + Number

// 2. Enter your published Google Sheet ID
// The ID is the long string of letters and numbers in your Google Sheet URL
// Example URL: https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0/edit
// ID is: 1A2B3C4D5E6F7G8H9I0
const GOOGLE_SHEET_ID = "1ovzJhs-40RuuV9PFPL5M70KCUiLh5NByjm4fDg5C-JE";

// ==================================================
// SYSTEM VARIABLES (DO NOT EDIT)
// ==================================================
let storeData = { products: [], settings: {} };
let currentCategory = 'All';
let currentSearch = '';

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {
        await fetchSettings();
        await fetchProducts();
        
        applySettings();
        generateCategories();
        renderProducts();
        
        setupSearch();
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error("Error initializing store:", error);
        document.getElementById('loading').innerHTML = "<p>Error loading store data. Please check your Google Sheet configuration.</p>";
    }
}

// Mobile Menu Toggle
function toggleMenu() {
    const nav = document.getElementById('nav-links');
    nav.classList.toggle('active');
}

// ==================================================
// FETCH DATA FROM GOOGLE SHEETS
// ==================================================
async function fetchSheetJSON(sheetName) {
    // We use Google Visualization API format which returns a JSON string wrapped in a function call
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;
    const response = await fetch(url);
    const text = await response.text();
    
    // Strip the outer function call `google.visualization.Query.setResponse(...)`
    const jsonString = text.substring(47).slice(0, -2);
    const json = JSON.parse(jsonString);
    
    // Extract column names
    const cols = json.table.cols.map(c => c.label.toLowerCase().trim());
    
    // Map rows to array of objects
    return json.table.rows.map(row => {
        let rowObj = {};
        cols.forEach((col, i) => {
            if (col) {
                rowObj[col] = row.c[i] && row.c[i].v != null ? row.c[i].v : '';
            }
        });
        return rowObj;
    });
}

async function fetchSettings() {
    const rows = await fetchSheetJSON('Settings');
    if(rows.length > 0) {
        storeData.settings = rows[0]; 
    }
}

async function fetchProducts() {
    const rows = await fetchSheetJSON('Products');
    storeData.products = rows.filter(p => String(p.active).toUpperCase() === 'TRUE');
}

// ==================================================
// APPLY SETTINGS TO UI
// ==================================================
function applySettings() {
    const s = storeData.settings;
    
    // Header & Brand
    document.title = s.store_name || 'Furniture Store';
    document.getElementById('store-name-header').innerText = s.store_name;
    document.getElementById('footer-store-name').innerText = s.store_name;
    document.getElementById('contact-store-name').innerText = s.store_name;
    document.getElementById('copyright-name').innerText = s.store_name;
    
    if(s.logo_url) {
        const logo = document.getElementById('store-logo');
        logo.src = s.logo_url;
        logo.style.display = 'block';
    }

    // Hero Section
    if(s.hero_title) document.getElementById('hero-title').innerText = s.hero_title;
    if(s.hero_description) document.getElementById('hero-desc').innerText = s.hero_description;

    // Contact Details
    if(s.address) {
        document.getElementById('contact-address').innerText = s.address;
        document.getElementById('footer-address').innerText = s.address;
    }
    if(s.opening_time && s.closing_time) {
        document.getElementById('contact-hours').innerText = `${s.opening_time} - ${s.closing_time}`;
    }
    if(s.phone) {
        document.getElementById('contact-phone').innerText = s.phone;
        document.getElementById('footer-phone').innerText = `Phone: ${s.phone}`;
    }
    if(s.instagram) {
        const ig = document.getElementById('contact-ig');
        ig.href = s.instagram;
        ig.style.display = 'inline-block';
    }
}

// ==================================================
// RENDER PRODUCTS
// ==================================================
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const offersGrid = document.getElementById('offers-grid');
    const featuredGrid = document.getElementById('featured-grid');
    const offersSection = document.getElementById('offers-section');
    const featuredSection = document.getElementById('featured-section');
    const noProducts = document.getElementById('no-products-msg');
    
    grid.innerHTML = '';
    offersGrid.innerHTML = '';
    featuredGrid.innerHTML = '';
    
    let filteredProducts = storeData.products;

    // Apply Filters
    if (currentCategory !== 'All') {
        filteredProducts = filteredProducts.filter(p => p.category === currentCategory);
    }
    if (currentSearch) {
        const lowerSearch = currentSearch.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
            String(p.name).toLowerCase().includes(lowerSearch) || 
            String(p.category).toLowerCase().includes(lowerSearch) || 
            String(p.description).toLowerCase().includes(lowerSearch)
        );
    }

    if (filteredProducts.length === 0) {
        noProducts.style.display = 'block';
    } else {
        noProducts.style.display = 'none';
        filteredProducts.forEach(p => grid.appendChild(createProductCard(p)));
    }

    // Populate Offers
    const offers = storeData.products.filter(p => String(p.offer_active).toUpperCase() === 'TRUE');
    if(offers.length > 0) {
        offersSection.style.display = 'block';
        offers.forEach(p => offersGrid.appendChild(createProductCard(p)));
    } else {
        offersSection.style.display = 'none';
    }

    // Populate Featured
    const featured = storeData.products.filter(p => String(p.featured).toUpperCase() === 'TRUE');
    if(featured.length > 0) {
        featuredSection.style.display = 'block';
        featured.forEach(p => featuredGrid.appendChild(createProductCard(p)));
    } else {
        featuredSection.style.display = 'none';
    }
}

function createProductCard(product) {
    const isOffer = String(product.offer_active).toUpperCase() === 'TRUE';
    const isFeatured = String(product.featured).toUpperCase() === 'TRUE';
    
    const card = document.createElement('div');
    card.className = 'product-card';
    
    let priceHTML = `<div class="price-normal">₹${formatNumber(product.price)}</div>`;
    
    if (isOffer && product.offer_price) {
        priceHTML = `
            <div class="price-offer-wrapper">
                <span class="price-strikethrough">₹${formatNumber(product.price)}</span>
                <span class="price-discounted">₹${formatNumber(product.offer_price)}</span>
            </div>
        `;
    }

    let badges = '';
    if (isOffer && product.discount) badges += `<div class="discount-badge">${product.discount} OFF</div>`;
    if (isFeatured && !isOffer) badges += `<div class="featured-badge">Featured</div>`;

    const imgUrl = product.image || 'https://via.placeholder.com/400x300?text=No+Image';

    card.innerHTML = `
        <img src="${imgUrl}" alt="${product.name}" class="product-image" loading="lazy">
        ${badges}
        <div class="product-details">
            <span class="product-category">${product.category}</span>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-desc">${product.description}</p>
            <div class="price-container">${priceHTML}</div>
            <button class="btn-whatsapp card-btn" onclick="orderProduct('${encodeURIComponent(JSON.stringify(product))}')">
                Order on WhatsApp
            </button>
        </div>
    `;
    return card;
}

// ==================================================
// FILTERING & SEARCH
// ==================================================
function generateCategories() {
    const container = document.getElementById('categories-container');
    const categories = new Set(storeData.products.map(p => p.category).filter(c => c));
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.innerText = cat;
        btn.onclick = () => filterCategory(cat, btn);
        container.appendChild(btn);
    });
}

function filterCategory(cat, btnElement = null) {
    currentCategory = cat;
    
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) {
        btnElement.classList.add('active');
    } else {
        document.querySelector('.category-btn').classList.add('active'); 
    }
    
    renderProducts();
    document.getElementById('all-products').scrollIntoView({ behavior: 'smooth' });
}

function setupSearch() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderProducts();
    });
}

// ==================================================
// WHATSAPP INTEGRATION
// ==================================================
function orderProduct(encodedProduct) {
    const product = JSON.parse(decodeURIComponent(encodedProduct));
    const currentPrice = String(product.offer_active).toUpperCase() === 'TRUE' ? product.offer_price : product.price;
    
    const message = `Hello, I am interested in this product:\n\n*Product:* ${product.name}\n*Price:* ₹${formatNumber(currentPrice)}\n*Category:* ${product.category}\n\nPlease share more details.`;
    
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function contactStoreGeneral() {
    const message = `Hello, I visited your website and would like to know more about your furniture collection.`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

function formatNumber(num) {
    if(!num) return '0';
    return Number(num).toLocaleString('en-IN');
}
