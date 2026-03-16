document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicjalizacja Ikon Lucide
    lucide.createIcons();

    // 2. Inicjalizacja tła 3D Vanta.js (Efekt NET/Cyberpunk)
    // Wymaga dołączenia skryptu z Three.js i vanta.net.min.js
    if (window.VANTA) {
        window.VANTA.NET({
            el: "#vanta-bg",
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00,
            color: 0xbc13fe, // neon purple
            backgroundColor: 0x050505, // deep space dark
            points: 12.00,
            maxDistance: 22.00,
            spacing: 16.00,
            showDots: true
        });
    }

    // 3. Obsługa Scrolla dla nawigacji (Blur effect on nav when scrolled)
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // 4. Elementy pojawiające się przy scrollowaniu
    // Używamy IntersectionObserver do obsługi klas fade-in
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Przestajemy obserwować element, jeśli ma się pojawić tylko raz
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Wybieramy wszystkie elementy do animacji
    const animateElements = document.querySelectorAll('.fade-in, .fade-in-up, .fade-in-left');
    animateElements.forEach(el => observer.observe(el));

    // 5. Efekt podążania za myszką na przyciskach holograficznych (Opcjonalnie dla kart portfolio)
    const cards = document.querySelectorAll('.glass');
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Delikatny efekt podświetlenia w miejscu kursora na kartach
            card.style.background = `rgba(20, 20, 25, 0.4) radial-gradient(circle at ${x}px ${y}px, rgba(188, 19, 254, 0.1) 0%, transparent 40%) no-repeat`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.background = `rgba(20, 20, 25, 0.4)`;
        });
    });

    // 6. Formularz kontaktowy - bezpieczna wysyłka ze schowanym e-mailem
    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // POBIERZ URL Z GOOGLE APPS SCRIPT (Web App URL)
            // TUTAJ WKLEJ SWÓJ URL PO WDROŻENIU SKRYPTU
            const scriptURL = 'https://script.google.com/macros/s/AKfycbxhofksejO2y5VwKW6JSl1Dn5G5Huzqg_5AJaDuF8R_ZbsstRgL0eOAxG7vylCTDQcV/exec';

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnContent = submitBtn.innerHTML;
            
            // Zmiana przycisku na stan ładowania
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Wysyłanie...';

            const formData = new FormData(form);

            fetch(scriptURL, { method: 'POST', body: formData })
                .then(response => {
                    console.log('Success!', response);
                    submitBtn.innerHTML = 'Wysłano pomyślnie!';
                    submitBtn.classList.remove('btn-primary');
                    submitBtn.classList.add('btn-success'); // Zakładając, że masz taką klasę lub dodamy style
                    form.reset();
                    
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnContent;
                        submitBtn.classList.remove('btn-success');
                        submitBtn.classList.add('btn-primary');
                    }, 5000);
                })
                .catch(error => {
                    console.error('Error!', error.message);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Błąd! Spróbuj ponownie';
                    
                    setTimeout(() => {
                        submitBtn.innerHTML = originalBtnContent;
                    }, 3000);
                });
        });
    }

    // 7. Cookie Consent Logic
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptCookies = document.getElementById('accept-cookies');
    const declineCookies = document.getElementById('decline-cookies');

    if (cookieBanner && !localStorage.getItem('cookieConsent')) {
        setTimeout(() => {
            cookieBanner.classList.remove('hidden');
        }, 2000);
    }

    if (acceptCookies) {
        acceptCookies.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'accepted');
            cookieBanner.classList.add('hidden');
        });
    }

    if (declineCookies) {
        declineCookies.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'declined');
            cookieBanner.classList.add('hidden');
        });
    }

    // 8. Privacy Policy Modal Logic
    const privacyModal = document.getElementById('privacy-modal');
    const openPrivacy = document.getElementById('open-privacy');
    const closePrivacy = document.querySelector('.close-modal');
    const modalOverlay = document.querySelector('.modal-overlay');

    if (openPrivacy && privacyModal) {
        openPrivacy.addEventListener('click', (e) => {
            e.preventDefault();
            privacyModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Stop scrolling
        });
    }

    const closeModalFunc = () => {
        privacyModal.classList.add('hidden');
        document.body.style.overflow = ''; // Resume scrolling
    };

    if (closePrivacy) {
        closePrivacy.addEventListener('click', closeModalFunc);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModalFunc);
    }
});
