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

            const nazwa = document.getElementById('name').value;
            const userEmail = document.getElementById('email').value;
            const wiadomosc = document.getElementById('message').value;

            // Schowany adres email burda.marcin@me.com
            const part1 = "burda.marcin";
            const part2 = "me.com";
            const adres = part1 + "@" + part2;

            const subject = encodeURIComponent("Wiadomość z portolio od: " + nazwa);
            const body = encodeURIComponent(
                "Od: " + nazwa + "\n" +
                "E-mail kontaktowy: " + userEmail + "\n\n" +
                "Treść wiadomości:\n" + wiadomosc
            );

            // Otwieramy domyślnego klienta poczty
            window.location.href = `mailto:${adres}?subject=${subject}&body=${body}`;
        });
    }
});
