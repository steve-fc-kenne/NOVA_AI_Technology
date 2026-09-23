
const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");

menuToggle.addEventListener("click", function () {
    mainNav.classList.toggle("active");
});


const navLinks = document.querySelectorAll("#main-nav a");

navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
        mainNav.classList.remove("active");
    });
});


const contactForm = document.getElementById("contact-form");
const formMessage = document.getElementById("form-message");
const submitButton = document.getElementById("submit-button");


contactForm.addEventListener("submit", async function (event) {

    // Empêche le rechargement de la page
    event.preventDefault();


    // Récupération des valeurs
    const nom = document.getElementById("nom").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();


    // Vérification des champs vides
    if (nom === "" || email === "" || message === "") {

        formMessage.textContent = "Veuillez remplir tous les champs.";
        formMessage.style.color = "red";

        return;
    }


    // Vérification de la structure de l'adresse email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        formMessage.textContent = "Veuillez entrer une adresse e-mail valide.";
        formMessage.style.color = "red";

        return;
    }


    // Désactivation du bouton pendant l'envoi
    submitButton.disabled = true;
    submitButton.textContent = "Envoi en cours...";

    formMessage.textContent = "";


    try {

        // Préparation des données du formulaire
        const formData = new FormData(contactForm);


        // Envoi vers Formspree
        const response = await fetch(contactForm.action, {
            method: "POST",
            body: formData,
            headers: {
                "Accept": "application/json"
            }
        });


        // Vérification de la réponse de Formspree
        if (response.ok) {

            formMessage.textContent =
                "Votre message a été envoyé avec succès !";

            formMessage.style.color = "green";


            // Réinitialisation du formulaire
            contactForm.reset();


            // Retour en haut de la page
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        } else {

            formMessage.textContent =
                "Une erreur est survenue. Votre message n'a pas pu être envoyé.";

            formMessage.style.color = "red";
        }


    } catch (error) {

        formMessage.textContent =
            "Impossible de contacter le serveur. Vérifiez votre connexion Internet.";

        formMessage.style.color = "red";

    }


    // Réactivation du bouton
    submitButton.disabled = false;
    submitButton.textContent = "Envoyer le message →";

});