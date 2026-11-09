
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // 1. RÉCUPÉRATION DES ÉLÉMENTS HTML
    // ==========================================

    const world = document.getElementById("nait-world");
    const journeySection = document.getElementById("univers-nait");

    const title = document.getElementById("nait-scene-title");
    const description = document.getElementById("nait-scene-description");

    const previousButton = document.getElementById("nait-prev");
    const playButton = document.getElementById("nait-play");
    const nextButton = document.getElementById("nait-next");

    const progress = document.getElementById("nait-progress");
    const progressBar = document.getElementById("nait-progress-bar");

    const hotspots = document.querySelectorAll(".nait-hotspot");

    // Vérification des éléments indispensables
    if (
        !world ||
        !journeySection ||
        !title ||
        !description ||
        !previousButton ||
        !playButton ||
        !nextButton
    ) {
        console.warn("Animation NAIT : certains éléments HTML sont introuvables.");
        return;
    }


    // ==========================================
    // 2. CONTENU DES CINQ SCÈNES
    // ==========================================

    const scenes = [
        {
            title: "1. La maison intelligente",
            description:
                "Imaginez une maison capable de gérer intelligemment son éclairage, sa ventilation et certains équipements. Des capteurs détectent les événements et un système de commande pilote les appareils."
        },
        {
            title: "2. L'électricité et la distribution",
            description:
                "L'énergie électrique alimente les installations. Les protections, les tableaux électriques et les dispositifs de commande contribuent à distribuer et à maîtriser cette énergie en toute sécurité."
        },
        {
            title: "3. L'usine automatisée",
            description:
                "Dans une usine, les capteurs mesurent les grandeurs physiques. Un automate programmable industriel traite les informations et commande les moteurs, convoyeurs et autres actionneurs."
        },
        {
            title: "4. Les objets connectés et l'IoT",
            description:
                "Les équipements connectés échangent des données grâce aux réseaux. Ces informations permettent de surveiller les installations et de suivre leur fonctionnement à distance."
        },
        {
            title: "5. L'intelligence artificielle",
            description:
                "L'intelligence artificielle peut analyser les données, repérer des anomalies et aider à optimiser les installations. Les fonctions critiques de sécurité restent assurées par les protections et systèmes de commande adaptés."
        }
    ];


    // ==========================================
    // 3. PARAMÈTRES DE L'ANIMATION
    // ==========================================

    let currentScene = 0;
    let animationTimer = null;
    let sectionIsVisible = true;

    const sceneDuration = 4000;
    const zoom = 2;

    const cameraPositions = [
        { x: 18, y: 48 },
        { x: 35, y: 55 },
        { x: 72, y: 48 },
        { x: 53, y: 20 },
        { x: 83, y: 35 }
    ];

    const motionPreference = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;


    // ==========================================
    // 4. AFFICHAGE D'UNE SCÈNE
    // ==========================================

    function showScene(index) {

        // Passage automatique de la dernière scène à la première
        currentScene = (index + scenes.length) % scenes.length;

        const scene = scenes[currentScene];
        const camera = cameraPositions[currentScene];

        // Mise à jour du texte
        title.textContent = scene.title;
        description.textContent = scene.description;

        // Déplacement de la caméra virtuelle
        const translateX = (50 - camera.x) * (zoom - 0.1);
        const translateY = (50 - camera.y) * (zoom - 0.1);

        world.style.transform =
            `translate3d(${translateX}%, ${translateY}%, 0) scale(${zoom})`;

        // Mise à jour des points interactifs
        hotspots.forEach((hotspot, index) => {

            const isActive = index === currentScene;

            hotspot.style.opacity = isActive ? "1" : "0.65";

            hotspot.style.transform = isActive
                ? "scale(1.2)"
                : "scale(1)";
        });

        // Mise à jour de la progression
        const percentage =
            ((currentScene + 1) / scenes.length) * 100;

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }

        if (progress) {
            progress.setAttribute(
                "aria-valuenow",
                Math.round(percentage)
            );
        }
    }


    // ==========================================
    // 5. MISE À JOUR DU BOUTON LECTURE / PAUSE
    // ==========================================

    function updatePlayButton() {

        const isPlaying = animationTimer !== null;

        playButton.textContent = isPlaying
            ? "Pause"
            : "Reprendre";

        playButton.setAttribute(
            "aria-label",
            isPlaying
                ? "Mettre l'animation en pause"
                : "Reprendre l'animation"
        );

        playButton.setAttribute(
            "aria-pressed",
            String(isPlaying)
        );
    }


    // ==========================================
    // 6. ARRÊT DE L'ANIMATION
    // ==========================================

    function pauseAnimation() {

        if (animationTimer !== null) {
            clearInterval(animationTimer);
            animationTimer = null;
        }

        updatePlayButton();
    }


    // ==========================================
    // 7. DÉMARRAGE DE L'ANIMATION
    // ==========================================

    
function playAnimation() {

    // Respect de la préférence de réduction des animations
    if (motionPreference && motionPreference.matches) {
        pauseAnimation();
        return;
    }

    // Ne pas lancer l'animation hors de la section
    if (!sectionIsVisible) {
        pauseAnimation();
        return;
    }

    // Éviter plusieurs minuteries simultanées
    if (animationTimer !== null) {
        return;
    }

    // Transition immédiate vers la scène suivante
    showScene(currentScene + 1);

    // Puis transitions automatiques toutes les 8 secondes
    animationTimer = setInterval(() => {
        showScene(currentScene + 1);
    }, sceneDuration);

    updatePlayButton();
}



    // ==========================================
    // 8. COMMANDES PRÉCÉDENT ET SUIVANT
    // ==========================================

    previousButton.addEventListener("click", () => {

        pauseAnimation();
        showScene(currentScene - 1);

    });


    nextButton.addEventListener("click", () => {

        pauseAnimation();
        showScene(currentScene + 1);

    });


    // ==========================================
    // 9. COMMANDE LECTURE / PAUSE
    // ==========================================

    playButton.addEventListener("click", () => {

        if (animationTimer !== null) {
            pauseAnimation();
        } else {
            playAnimation();
        }

    });


    // ==========================================
    // 10. GESTION DES POINTS INTERACTIFS
    // ==========================================

    hotspots.forEach((hotspot) => {

        hotspot.addEventListener("click", () => {

            const sceneIndex = Number(hotspot.dataset.scene);

            if (
                !Number.isInteger(sceneIndex) ||
                sceneIndex < 0 ||
                sceneIndex >= scenes.length
            ) {
                return;
            }

            pauseAnimation();
            showScene(sceneIndex);

        });

    });


    // ==========================================
    // 11. RESPECT DES PRÉFÉRENCES UTILISATEUR
    // ==========================================

    if (motionPreference) {

        const handleMotionPreference = (event) => {

            if (event.matches) {
                pauseAnimation();
            }

        };

        if (motionPreference.addEventListener) {
            motionPreference.addEventListener(
                "change",
                handleMotionPreference
            );
        } else if (motionPreference.addListener) {
            motionPreference.addListener(
                handleMotionPreference
            );
        }
    }


    // ==========================================
    // 12. GESTION DE LA VISIBILITÉ DE LA PAGE
    // ==========================================

    document.addEventListener("visibilitychange", () => {

        if (document.hidden) {
            pauseAnimation();
        }

    });


   
    // ==========================================
    // 13. GESTION DE LA VISIBILITÉ DE LA SECTION
    // ==========================================

    if ("IntersectionObserver" in window) {

        const observer = new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {

                    sectionIsVisible = entry.isIntersecting;

                    // Lancement automatique à l'arrivée dans la section
                    if (sectionIsVisible && animationTimer === null) {
                        playAnimation();
                    }

                    // Pause lorsque la section quitte l'écran
                    if (!sectionIsVisible) {
                        pauseAnimation();
                    }

                });

            },
            {
                threshold: 0.1
            }
        );

        observer.observe(journeySection);

    } else {

        // Compatibilité avec les navigateurs sans IntersectionObserver
        sectionIsVisible = true;
        playAnimation();

    }


});
