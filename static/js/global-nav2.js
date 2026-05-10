// --- VARIABEL DATA SEARCH GABUNGAN ---
const G_BASE_URL = 'https://script.google.com/macros/s/AKfycbwxLRb8CBM0KaUhk5hVpYO2NatXul2zwxtqwIldC4ewFp1lrVWgJbRVwFMlJhUW9Y_9/exec'; 
let G_ALL_SEARCH_DATA = [];
/* ============================================================
   static/js/global-nav.js (VERSI AUTO-TRIGGER & ANTI-BENTROK)
   Mencakup: Loading, Navigasi Mobile, & Search Gabungan
   ============================================================ */

/* 1. LOGIKA LOADING SCREEN GLOBAL */
window.addEventListener("load", function() {
    const G_loader = document.querySelector(".loader-wrapper");
    if (G_loader) {
        setTimeout(() => {
            G_loader.classList.add("loaded");
        }, 1200); 
    }
    
    // --- AUTO TRIGGER DATA ---
    // Jika di halaman tersebut ada fungsi muatArtikel (seperti di Warta), jalankan otomatis!
    if (typeof muatArtikel === 'function') {
        console.log("Memicu muatArtikel() dari Global Script...");
        muatArtikel();
    }
    // Jika di halaman Pendidikan ada fungsi loadData, jalankan juga
    else if (typeof initPendidikan === 'function') {
        initPendidikan();
    }
});

/* 2. LOGIKA NAVIGASI & SEARCH */
document.addEventListener('DOMContentLoaded', function() {
    // --- VARIABEL ELEMEN DENGAN NAMA UNIK ---
    const G_menuToggle = document.querySelector('.menu-toggle');
    const G_navLinks = document.querySelector('.nav-links');
    const G_dropdownBtn = document.querySelector('.dropdown-btn');
    const G_dropdownParent = document.querySelector('.dropdown');
    const G_header = document.querySelector('header') || document.querySelector('.navbar-donasi'); 
    
    const G_searchIcon = document.querySelector('.search-icon-mobile');
    const G_searchOverlay = document.getElementById('searchOverlay');
    const G_closeSearch = document.getElementById('closeSearch');
    const G_searchInput = document.getElementById('searchInput');
    const G_boxSaran = document.getElementById('searchSuggestions');


    // A. MENU MOBILE (GARIS TIGA)
    if (G_menuToggle && G_navLinks) {
        G_menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            G_header.classList.toggle('nav-active'); 
            G_navLinks.classList.toggle('active');
        });
    }

    // B. DROPDOWN TENTANG
    if (G_dropdownBtn && G_dropdownParent) {
        G_dropdownBtn.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation();
                G_dropdownParent.classList.toggle('show');
            }
        });
    }

    // C. SEARCH OVERLAY (BUKA/TUTUP)
    if (G_searchIcon && G_searchOverlay) {
        G_searchIcon.addEventListener('click', () => {
            G_searchOverlay.classList.add('active');
            if (G_searchInput) G_searchInput.focus();
        });
    }

    if (G_closeSearch) {
        G_closeSearch.addEventListener('click', () => {
            G_searchOverlay.classList.remove('active');
            if (G_boxSaran) G_boxSaran.innerHTML = '';
            if (G_searchInput) G_searchInput.value = '';
        });
    }

    // D. TARIK DATA SEARCH GABUNGAN
    async function G_initSearchEngine() {
        try {
            const [resPendidikan, resWarta] = await Promise.all([
                fetch(`${G_BASE_URL}?action=getArticles`),
                fetch(`${G_BASE_URL}?action=getWarta`)
            ]);

            const dPendidikan = await resPendidikan.json();
            const dWarta = await resWarta.json();

            G_ALL_SEARCH_DATA = [
                ...dPendidikan.map(item => ({ ...item, tipeData: 'pendidikan' })),
                ...dWarta.map(item => ({ ...item, tipeData: 'warta' }))
            ];
            console.log("Global Search Engine Ready! Data:", G_ALL_SEARCH_DATA.length);
        } catch (e) {
            console.error("Gagal muat data search:", e);
        }
    }
    G_initSearchEngine();

    // E. LOGIKA SUGGESTION
    if (G_searchInput && G_boxSaran) {
        G_searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            
            if (!keyword || G_ALL_SEARCH_DATA.length === 0) {
                G_boxSaran.innerHTML = '';
                return;
            }

            const hasil = G_ALL_SEARCH_DATA.filter(item => 
                (item.judul && item.judul.toLowerCase().includes(keyword)) || 
                (item.penulis && item.penulis.toLowerCase().includes(keyword))
            ).slice(0, 5);

            if (hasil.length > 0) {
                G_boxSaran.innerHTML = hasil.map(item => {
                    const typeParam = item.tipeData === 'warta' ? 'warta' : 'pendidikan';
                    return `
                        <div class="suggestion-item" onclick="window.location.href='template-artikel.html?id=${item.id}&type=${typeParam}'">
                            <strong>${item.judul}</strong>
                            <small>${item.tipeData === 'warta' ? '[WARTA]' : '[ARTIKEL]'} - ${item.penulis}</small>
                        </div>`;
                }).join('');
            } else {
                G_boxSaran.innerHTML = '<div class="suggestion-item">Tidak ditemukan...</div>';
            }
        });

        // Enter Key
        G_searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && G_searchInput.value) {
                window.location.href = `search-result.html?q=${encodeURIComponent(G_searchInput.value)}`;
            }
        });
    }

    // F. KLIK LUAR UNTUK TUTUP SEMUA
    document.addEventListener('click', function(e) {
        if (G_navLinks && G_navLinks.classList.contains('active')) {
            if (!G_navLinks.contains(e.target) && !G_menuToggle.contains(e.target)) {
                G_navLinks.classList.remove('active');
                G_header.classList.remove('nav-active'); 
            }
        }
        if (G_searchOverlay && G_searchOverlay.classList.contains('active')) {
            if (!G_searchOverlay.contains(e.target) && !G_searchIcon.contains(e.target)) {
                G_boxSaran.innerHTML = '';
            }
        }
    });
});