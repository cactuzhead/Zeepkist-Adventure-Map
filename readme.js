document.addEventListener('DOMContentLoaded', () => {
    const navs = document.querySelectorAll(
        '.sidebar-nav, .readme-nav-list'
    );

    navs.forEach(nav => {
        const indicator = nav.querySelector('.readme-sidebar-indicator');

        const links = Array.from(nav.querySelectorAll('a')).filter(link => {
            const href = link.getAttribute('href');
            return href?.startsWith('#') &&
                document.getElementById(href.slice(1));
        });

        const sections = links.map(link =>
            document.getElementById(link.getAttribute('href').slice(1))
        );

        function updateIndicator(link) {
            if (!indicator || !link) return;

            const navRect = nav.getBoundingClientRect();
            const linkRect = link.getBoundingClientRect();

            indicator.style.transform =
                `translateY(${linkRect.top - navRect.top}px)`;
            indicator.style.height = `${linkRect.height}px`;
        }

        function setActive(index) {
            links.forEach((link, i) => {
                link.classList.toggle('active', i === index);
            });

            if (index >= 0) updateIndicator(links[index]);
        }

        function highlightActiveSection() {
            if (!sections.length) return;

            if (window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 15) {
                setActive(sections.length - 1);
                return;
            }

            let activeIndex = 0;

            sections.forEach((section, i) => {
                if (section.getBoundingClientRect().top <= 180) {
                    activeIndex = i;
                }
            });

            setActive(activeIndex);
        }

        let ticking = false;

        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                highlightActiveSection();
                ticking = false;
            });
        });

        window.addEventListener('resize', highlightActiveSection);

        // Update immediately when a sidebar link is clicked.
        links.forEach((link, index) => {
            link.addEventListener('click', () => {
                setActive(index);
            });
        });

        highlightActiveSection();
    });
});