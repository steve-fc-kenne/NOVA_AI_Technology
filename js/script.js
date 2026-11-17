/* ==========================================================
   NAIT — script.js
   Menu ☰ (accueil et pages projets) + formulaire de contact.
   Chaque partie ne s'active que si ses éléments existent sur la page,
   ce qui évite les erreurs sur les pages projets.
   ========================================================== */

(function () {
    "use strict";

    // ==========================================
    // 1. MENU ☰
    // ==========================================

    var menuToggle = document.getElementById("menu-toggle");
    var mainNav = document.getElementById("main-nav");

    if (menuToggle && mainNav) {

        var menuIcon = menuToggle.querySelector("span") || menuToggle;

        function setMenu(open) {
            mainNav.classList.toggle("active", open);

            menuToggle.setAttribute("aria-expanded", open ? "true" : "false");

            menuToggle.setAttribute(
                "aria-label",
                open
                    ? "Fermer le menu de navigation"
                    : "Ouvrir le menu de navigation"
            );

            menuIcon.textContent = open ? "✕" : "☰";
        }

        menuToggle.addEventListener("click", function () {
            setMenu(!mainNav.classList.contains("active"));
        });

        // Un clic sur un lien referme le menu.
        mainNav.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                setMenu(false);
            });
        });

        // Un clic ailleurs referme le menu.
        document.addEventListener("click", function (event) {
            if (
                mainNav.classList.contains("active") &&
                !mainNav.contains(event.target) &&
                !menuToggle.contains(event.target)
            ) {
                setMenu(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && mainNav.classList.contains("active")) {
                setMenu(false);
                menuToggle.focus();
            }
        });

        // Retour au grand écran : menu refermé.
        window.addEventListener("resize", function () {
            if (window.innerWidth > 900) {
                setMenu(false);
            }
        });

        // Retour depuis le cache du navigateur : menu fermé.
        window.addEventListener("pageshow", function (event) {
            if (event.persisted) {
                setMenu(false);
            }
        });
    }

    // ==========================================
    // 2. FORMULAIRE DE CONTACT
    // ==========================================

    var contactForm = document.getElementById("contact-form");
    var formMessage = document.getElementById("form-message");
    var submitButton = document.getElementById("submit-button");

    if (!contactForm || !formMessage || !submitButton) return;

    // Affiche un message sous le bouton, SANS déplacer la page.
    // La page ne défile que si le message n'est pas entièrement visible,
    // et uniquement de la distance nécessaire pour le montrer.
    function showFormMessage(type, text) {

        formMessage.textContent = text;

        formMessage.classList.remove("is-success", "is-error");
        formMessage.classList.add(type === "success" ? "is-success" : "is-error");

        formMessage.setAttribute("role", type === "success" ? "status" : "alert");

        var rect = formMessage.getBoundingClientRect();

        var fullyVisible =
            rect.top >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

        if (!fullyVisible) {
            formMessage.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function clearFormMessage() {
        formMessage.textContent = "";
        formMessage.classList.remove("is-success", "is-error");
    }

    // Le message de confirmation reste affiché jusqu'à ce que
    // le visiteur commence à écrire un nouveau message.
    contactForm.addEventListener("input", clearFormMessage);

    contactForm.addEventListener("submit", async function (event) {

        // Empêche le rechargement de la page
        event.preventDefault();

        // Évite un double envoi
        if (submitButton.disabled) return;

        // Récupération des valeurs
        var nom = document.getElementById("nom").value.trim();
        var email = document.getElementById("email").value.trim();
        var message = document.getElementById("message").value.trim();

        // Vérification des champs vides
        if (nom === "" || email === "" || message === "") {
            showFormMessage("error", "Veuillez remplir tous les champs.");
            return;
        }

        // Vérification de la structure de l'adresse email
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            showFormMessage("error", "Veuillez entrer une adresse e-mail valide.");
            return;
        }

        // Désactivation du bouton pendant l'envoi
        submitButton.disabled = true;
        submitButton.textContent = "Envoi en cours...";

        clearFormMessage();

        try {

            // Préparation des données du formulaire
            var formData = new FormData(contactForm);

            // Envoi vers Formspree
            var response = await fetch(contactForm.action, {
                method: "POST",
                body: formData,
                headers: {
                    "Accept": "application/json"
                }
            });

            if (response.ok) {

                // Réinitialisation du formulaire
                contactForm.reset();

                // Confirmation visible, sans aucun défilement automatique vers le haut.
                showFormMessage(
                    "success",
                    "Votre message a été envoyé avec succès ! Nous vous répondrons dès que possible."
                );

            } else {

                showFormMessage(
                    "error",
                    "Une erreur est survenue. Votre message n'a pas pu être envoyé."
                );
            }

        } catch (error) {

            showFormMessage(
                "error",
                "Impossible de contacter le serveur. Vérifiez votre connexion Internet."
            );
        }

        // Réactivation du bouton
        submitButton.disabled = false;
        submitButton.textContent = "Envoyer le message →";
    });

})();