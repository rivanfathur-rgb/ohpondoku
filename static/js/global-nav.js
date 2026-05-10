/* ini buat loading */
window.addEventListener("load", function() {
        const loader = document.querySelector(".loader-wrapper");
        
        // Kasih waktu logo buat diem bentar
        setTimeout(() => {
            loader.classList.add("loaded");
        }, 1200); 
    });
// INI GARIS TIGA MENU
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdownParent = document.querySelector('.dropdown');
    // --- TAMBAHAN VARIABEL HEADER ---
    const header = document.querySelector('header') || document.querySelector('.navbar-donasi'); 

    // 1. Logika Garis Tiga (Menu Mobile) - SUDAH DIUPDATE
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Kunci animasinya di sini:
            header.classList.toggle('nav-active'); 
            navLinks.classList.toggle('active');
        });
    }

    // 2. Logika Dropdown "Tentang" (Tetap)
    if (dropdownBtn && dropdownParent) {
        dropdownBtn.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation();
                dropdownParent.classList.toggle('show');
            }
        });
    }

    // 3. Klik di luar buat nutup (DIPERKETAT)
    document.addEventListener('click', function(e) {
        if (navLinks && navLinks.classList.contains('active')) {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
                // Jangan lupa hapus class di header pas menu ditutup klik luar
                header.classList.remove('nav-active'); 
            }
        }
        
        if (dropdownParent && dropdownParent.classList.contains('show')) {
            if (!dropdownParent.contains(e.target)) {
                dropdownParent.classList.remove('show');
            }
        }
    });

    // 4. Logika Search Overlay (Baru)
    const searchIcon = document.querySelector('.search-icon-mobile');
    const searchOverlay = document.getElementById('searchOverlay');
    const closeSearch = document.getElementById('closeSearch');
    const searchInput = document.getElementById('searchInput');

    // 1. Fungsi Buka Search
    searchIcon.addEventListener('click', () => {
        searchOverlay.classList.add('active');
        searchInput.focus(); // Biar otomatis keyboard HP muncul
    });

    // 2. Fungsi Tutup Search (Terupdate)
    closeSearch.addEventListener('click', () => {
        searchOverlay.classList.remove('active');
        
        // Reset konten di dalam kotak saran
        if (boxSaran) {
            boxSaran.innerHTML = '';
        }
        
        // Reset teks yang udah diketik di bar pencarian
        if (searchInput) {
            searchInput.value = '';
        }
    });
    // Tutup search pake tombol Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
            searchOverlay.classList.remove('active');
            boxSaran.innerHTML = '';
            searchInput.value = '';
        }
    });

    // 3. Fungsi Eksekusi Cari (Enter)
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const keyword = searchInput.value;
            if (keyword) {
                // Arahkan ke halaman hasil pencarian
                window.location.href = `search-result.html?q=${encodeURIComponent(keyword)}`;
            }
        }
    });

    // INI SEARCH SUGGESTIONS (Baru)
    // 1. Deklarasi Base URL (Tanpa parameter agar fleksibel)
    const baseURL = 'https://script.google.com/macros/s/AKfycbwxLRb8CBM0KaUhk5hVpYO2NatXul2zwxtqwIldC4ewFp1lrVWgJbRVwFMlJhUW9Y_9/exec'; 
    let allData = [];

    // 2. Ambil data gabungan pas halaman dibuka
    async function initSearchData() {
        try {
            // Narik dua data sekaligus (Pendidikan & Warta)
            const [resPendidikan, resWarta] = await Promise.all([
                fetch(`${baseURL}?action=getArticles`),
                fetch(`${baseURL}?action=getWarta`)
            ]);

            const dataPendidikan = await resPendidikan.json();
            const dataWarta = await resWarta.json();

            // Gabungkan dan beri label tipe supaya navigasinya gak salah alamat
            const gabungPendidikan = dataPendidikan.map(item => ({ ...item, tipeData: 'pendidikan' }));
            const gabungWarta = dataWarta.map(item => ({ ...item, tipeData: 'warta' }));

            allData = [...gabungPendidikan, ...gabungWarta];
            console.log("Data search gabungan siap! Total:", allData.length);
        } catch (e) {
            console.error("Gagal muat data search:", e);
        }
    }
    initSearchData();

    // 3. Logika Suggestion
    const inputSearch = document.getElementById('searchInput');
    const boxSaran = document.getElementById('searchSuggestions');

    if (inputSearch) {
        inputSearch.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            
            if (!keyword || allData.length === 0) {
                boxSaran.innerHTML = '';
                return;
            }

            // Filter berdasarkan judul atau penulis
            const hasil = allData.filter(item => 
                (item.judul && item.judul.toLowerCase().includes(keyword)) || 
                (item.penulis && item.penulis.toLowerCase().includes(keyword))
            ).slice(0, 5); // Ambil 5 teratas

            if (hasil.length > 0) {
                boxSaran.innerHTML = hasil.map(item => {
                    // Tentukan parameter URL berdasarkan tipe data
                    // Jika warta pakai action getDetailWarta, jika pendidikan pakai getDetail
                    const typeParam = item.tipeData === 'warta' ? 'warta' : 'pendidikan';
                    const urlTujuan = `template-artikel.html?id=${item.id}&type=${typeParam}`;

                    return `
                        <div class="suggestion-item" onclick="window.location.href='${urlTujuan}'">
                            <strong>${item.judul}</strong>
                            <small>${item.tipeData === 'warta' ? '[WARTA]' : '[ARTIKEL]'} - ${item.penulis}</small>
                        </div>
                    `;
                }).join('');
            } else {
                boxSaran.innerHTML = '<div class="suggestion-item">Tidak ditemukan...</div>';
            }
        });
    }

    // Sembunyikan saran kalau user klik di luar area search
    document.addEventListener('click', (e) => {
        const searchContainer = document.querySelector('.search-overlay'); // Sesuaikan dengan class pembungkus lu
        if (searchContainer && !searchContainer.contains(e.target)) {
            boxSaran.innerHTML = '';
        }
    });
});