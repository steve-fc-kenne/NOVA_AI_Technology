/* ============================================================
   NAIT AI — V4.3
   Widget stable et fluide entre l'accueil et les pages projets.
   Les modifications par rapport à la V3 sont repérées par // [V4] / [V4.1] / [V4.2] / [V4.3]
   IMPORTANT : ce script doit rester en fin de <body>.
   ============================================================ */

function initNaitAI() {

    // ==========================================
    // 0. CONTEXTE DE PAGE + INJECTION DU WIDGET  [V4]
    // ==========================================

    // [V4] Chemin vers la racine du site selon la page courante.
    const IS_PROJECT_PAGE = window.location.pathname.includes("/projets/");
    const BASE = IS_PROJECT_PAGE ? "../" : "";

    // [V4] Le widget est créé ici, une seule source pour toutes les pages.
    // Il ne doit donc plus être écrit dans index.html ni dans les pages projets.
    // [V4.2] Pendant la restauration, aucune animation ne doit rejouer
    // (ouverture de la fenêtre, apparition des messages) : c'est ce qui
    // faisait « clignoter » le widget à chaque changement de page.
    if (!document.getElementById("nait-ai-runtime-style")) {
        const runtimeStyle = document.createElement("style");
        runtimeStyle.id = "nait-ai-runtime-style";
        runtimeStyle.textContent =
            "#nait-ai-widget.nait-ai-restoring," +
            "#nait-ai-widget.nait-ai-restoring *{" +
            "animation-duration:0s!important;animation-delay:0s!important;" +
            "transition-duration:0s!important;transition-delay:0s!important;" +
            "scroll-behavior:auto!important;}";
        document.head.appendChild(runtimeStyle);
    }

    if (!document.getElementById("nait-ai-widget")) {
        document.body.insertAdjacentHTML("beforeend", `
<div id="nait-ai-widget">
    <button id="nait-ai-toggle" type="button" aria-label="Ouvrir NAIT AI" aria-expanded="false" aria-controls="nait-ai-window">
        <span class="nait-ai-icon">✦</span>
        <span>NAIT AI</span>
    </button>

    <section id="nait-ai-window" aria-label="Assistant conversationnel NAIT AI" hidden>

        <header class="nait-ai-header">
            <div class="nait-ai-brand">
                <img src="${BASE}images/logo-nait.png" alt="Logo NAIT">
                <div>
                    <h2>NAIT AI</h2>
                    <p id="nait-ai-status">Assistant technologique</p>
                </div>
            </div>
            <button id="nait-ai-close" type="button" aria-label="Fermer NAIT AI">×</button>
        </header>

        <div id="nait-ai-messages" aria-live="polite" aria-relevant="additions text">
            <div class="nait-ai-message nait-ai-message-bot">
                Bonjour ! Je suis NAIT AI.
                Comment puis-je vous accompagner dans votre projet ?
            </div>
        </div>

        <div id="nait-ai-suggestions">
            <button type="button" data-message="Présentez vos services">Découvrir nos services</button>
            <button type="button" data-message="Robot domotique">Robot domotique</button>
            <button type="button" data-message="Drone agricole">Drone agricole</button>
            <button type="button" data-message="Nous contacter">Nous contacter</button>
        </div>

        <form id="nait-ai-form">
            <input id="nait-ai-input" type="text" placeholder="Écrire un message..." autocomplete="off" aria-label="Votre message" required>
            <button id="nait-ai-send" type="submit" aria-label="Envoyer le message">➤</button>
        </form>

    </section>
</div>`);
    }

    // ==========================================
    // 1. CONFIGURATION
    // ==========================================

    const API_URL = "http://localhost:3000/api/chat";
    const STATUS_URL = "http://localhost:3000/api/status";

    const widget = document.getElementById("nait-ai-widget");
    const toggle = document.getElementById("nait-ai-toggle");
    const closeButton = document.getElementById("nait-ai-close");
    const windowChat = document.getElementById("nait-ai-window");
    const messagesContainer = document.getElementById("nait-ai-messages");
    const form = document.getElementById("nait-ai-form");
    const input = document.getElementById("nait-ai-input");
    const sendButton = document.getElementById("nait-ai-send");
    const statusText = document.getElementById("nait-ai-status");
    const suggestions = document.getElementById("nait-ai-suggestions");

    if (
        !widget ||
        !toggle ||
        !windowChat ||
        !form ||
        !input ||
        !messagesContainer ||
        !sendButton
    ) {
        console.error("NAIT AI : éléments HTML obligatoires introuvables.");
        return;
    }

    // ==========================================
    // 2. MÉMOIRE ET IDENTIFICATION DE SESSION
    // ==========================================

    const HISTORY_STORAGE_KEY = "nait_ai_conversation_history";
    const DISPLAY_STORAGE_KEY = "nait_ai_conversation_display";
    const SESSION_STORAGE_KEY = "nait_ai_session_id";
    const WINDOW_STATE_KEY = "nait_ai_window_open";

    // [V4] Nouvelles clés
    const DRAFT_STORAGE_KEY = "nait_ai_draft";                 // texte en cours de saisie
    const SCROLL_STORAGE_KEY = "nait_ai_scroll";               // position de lecture
    const PENDING_STORAGE_KEY = "nait_ai_pending_message";     // message dont la réponse a été coupée
    const CONTACT_PREFILL_KEY = "nait_ai_contact_prefill";     // message à préremplir sur l'accueil
    const HOME_SCROLL_KEY = "nait_position_accueil";           // clé déjà utilisée par index.html

    const MAX_HISTORY = 20;
    const MAX_DISPLAY_ENTRIES = 100;

    // Gestion sécurisée de sessionStorage.
    function storageGet(key) {
        try {
            return sessionStorage.getItem(key);
        } catch (error) {
            console.warn("NAIT AI : lecture du stockage impossible.", error);
            return null;
        }
    }

    function storageSet(key, value) {
        try {
            sessionStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.warn("NAIT AI : écriture du stockage impossible.", error);
            return false;
        }
    }

    function storageRemove(key) {
        try {
            sessionStorage.removeItem(key);
        } catch (error) {
            console.warn("NAIT AI : suppression du stockage impossible.", error);
        }
    }

    // Récupérer uniquement un historique valide.
    function loadConversationHistory() {
        try {
            const saved = JSON.parse(
                storageGet(HISTORY_STORAGE_KEY) || "[]"
            );

            if (!Array.isArray(saved)) return [];

            return saved
                .filter(item =>
                    item &&
                    ["user", "assistant"].includes(item.role) &&
                    typeof item.content === "string"
                )
                .slice(-MAX_HISTORY);

        } catch {
            return [];
        }
    }

    const conversationHistory = loadConversationHistory();

    function saveConversationHistory() {
        storageSet(
            HISTORY_STORAGE_KEY,
            JSON.stringify(conversationHistory)
        );
    }

    // Identifiant unique de session dans cet onglet.
    function createSessionId() {
        if (crypto.randomUUID) {
            return crypto.randomUUID();
        }

        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);

        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    let sessionId = storageGet(SESSION_STORAGE_KEY);

    if (
        !sessionId ||
        typeof sessionId !== "string" ||
        sessionId.length > 100
    ) {
        sessionId = createSessionId();
        storageSet(SESSION_STORAGE_KEY, sessionId);
    }

    // ==========================================
    // 3. ÉTAT GÉNÉRAL
    // ==========================================

    let isLoading = false;
    let isOpen = false;
    let restoringTimer = null; // [V4.2]
    let isLeaving = false; // [V4] vrai quand la page est en train d'être quittée

    let displayQueue = "";
    let displayTimer = null;
    let activeTyping = null;

    // ==========================================
    // 4. OUVERTURE / FERMETURE
    // ==========================================

    // [V4] focus : false à la restauration (évite le clavier mobile à chaque page)
    // [V4] keepScroll : true quand on rétablit soi-même la position de lecture
    function openChat({ focus = true, keepScroll = false } = {}) {

        windowChat.hidden = false;

        toggle.setAttribute("aria-expanded", "true");

        isOpen = true;

        storageSet(WINDOW_STATE_KEY, "open");

        // [V4] Un élément masqué n'a pas de défilement : on le fait une fois visible.
        if (!keepScroll) {
            scrollToBottom();
        }

        if (focus) {
            setTimeout(() => input.focus(), 100);
        }
    }

    function closeChat() {

        windowChat.hidden = true;

        toggle.setAttribute("aria-expanded", "false");

        isOpen = false;

        storageSet(WINDOW_STATE_KEY, "closed");
    }

    toggle.addEventListener("click", () => {
        isOpen ? closeChat() : openChat();
    });

    closeButton?.addEventListener("click", closeChat);

    // [V4] Mémoriser le brouillon de saisie.
    input.addEventListener("input", () => {
        storageSet(DRAFT_STORAGE_KEY, input.value);
    });

    // [V4] Au moment de quitter la page : position de lecture + drapeau.
    window.addEventListener("pagehide", () => {

        isLeaving = true;

        if (isOpen) {
            storageSet(
                SCROLL_STORAGE_KEY,
                String(messagesContainer.scrollTop)
            );
        }
    });

    // [V4.1] Retour via le cache du navigateur (bouton « Retour aux projets »,
    // flèche précédente). La page est restaurée telle qu'elle était AVANT la
    // navigation : sans resynchronisation, elle afficherait l'ancienne
    // conversation et écraserait celle faite sur la page projet.
    window.addEventListener("pageshow", event => {

        if (!event.persisted) return;

        isLeaving = false;

        if (isLoading) return;

        applySavedState();

        const pending = storageGet(PENDING_STORAGE_KEY);

        if (pending) {
            storageRemove(PENDING_STORAGE_KEY);
            sendMessage(pending, { replay: true });
        }
    });

    // ==========================================
    // 5. AFFICHAGE DES MESSAGES
    // ==========================================

    // [V4.3] Défilement instantané : un « scroll-behavior: smooth » dans le CSS
    // faisait glisser la conversation depuis le haut à chaque changement de page.
    function scrollMessagesTo(top) {
        messagesContainer.scrollTo({ top, behavior: "instant" });
    }

    function scrollToBottom() {
        scrollMessagesTo(messagesContainer.scrollHeight);
    }

    function addMessage(text, type = "bot", shouldSave = true) {

        const message = document.createElement("div");

        message.className =
            "nait-ai-message " +
            (type === "user"
                ? "nait-ai-message-user"
                : "nait-ai-message-bot");

        // textContent empêche l'interprétation de HTML reçu.
        message.textContent = String(text);

        messagesContainer.appendChild(message);

        if (shouldSave) {
            saveConversationDisplay();
        }

        scrollToBottom();

        return message;
    }

    // ==========================================
    // 6. INDICATEUR DE RÉFLEXION
    // ==========================================

    function showTyping() {

        const typing = document.createElement("div");

        typing.className =
            "nait-ai-message nait-ai-message-bot nait-ai-typing";

        typing.textContent = "NAIT AI réfléchit";

        messagesContainer.appendChild(typing);

        let dots = 0;

        const animation = setInterval(() => {

            dots = (dots + 1) % 4;

            typing.textContent =
                "NAIT AI réfléchit" + ".".repeat(dots);

        }, 400);

        scrollToBottom();

        activeTyping = {
            element: typing,
            animation
        };

        return activeTyping;
    }

    function removeTyping(typing) {

        if (!typing) return;

        clearInterval(typing.animation);

        typing.element.remove();

        if (activeTyping === typing) {
            activeTyping = null;
        }
    }

    // ==========================================
    // 7. ÉTAT DE L'INTERFACE
    // ==========================================

    function setLoading(state) {

        isLoading = state;

        input.disabled = state;
        sendButton.disabled = state;

        sendButton.textContent = state ? "…" : "➤";

        form.classList.toggle("nait-ai-loading", state);
    }

    // ==========================================
    // 8. LECTURE SÉCURISÉE DU STREAMING CLAUDE
    // ==========================================

    async function readClaudeStream(
        response,
        onText,
        onContactReady,
        onProjectReady
    ) {

        if (!response.body) {
            throw new Error("Flux de réponse indisponible.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let fullResponse = "";

        // Traiter un événement SSE complet.
        function processEvent(eventText) {

            const lines = eventText.split("\n");

            let eventName = "message";
            const dataLines = [];

            for (const line of lines) {

                if (!line || line.startsWith(":")) {
                    continue;
                }

                if (line.startsWith("event:")) {
                    eventName = line.slice(6).trim();
                }

                else if (line.startsWith("data:")) {
                    dataLines.push(
                        line.slice(5).replace(/^ /, "")
                    );
                }
            }

            if (dataLines.length === 0) return;

            const jsonText = dataLines.join("\n");

            if (jsonText === "[DONE]") return;

            let data;

            try {
                data = JSON.parse(jsonText);
            } catch {
                throw new Error("Événement SSE JSON invalide.");
            }

            if (eventName === "error" || data.error) {
                throw new Error(
                    data.error || "Erreur pendant le streaming."
                );
            }

            // Préparation du formulaire de contact.
            if (
                eventName === "contact_ready" &&
                typeof data.message === "string" &&
                data.message.trim()
            ) {
                onContactReady(data.message.trim());
                return;
            }

            // Autorisation de visite d'un projet.
            if (
                eventName === "project_ready" &&
                ["robot", "drone", "iot"].includes(data.project)
            ) {
                onProjectReady(data.project);
                return;
            }

            // Texte normal de l'assistant.
            if (typeof data.text === "string" && data.text.length > 0) {

                fullResponse += data.text;

                onText(data.text);
            }
        }

        try {

            while (true) {

                const { value, done } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, {
                    stream: true
                });

                // Normaliser les retours à la ligne SSE.
                buffer = buffer.replace(/\r\n/g, "\n");

                let separatorIndex;

                while (
                    (separatorIndex = buffer.indexOf("\n\n")) !== -1
                ) {

                    const eventText = buffer.slice(0, separatorIndex);

                    buffer = buffer.slice(separatorIndex + 2);

                    if (eventText.trim()) {
                        processEvent(eventText);
                    }
                }
            }

            buffer += decoder.decode();

            buffer = buffer.replace(/\r\n/g, "\n");

            if (buffer.trim()) {
                processEvent(buffer);
            }

            return fullResponse;

        } catch (error) {

            // Interrompre proprement le flux en cas d'erreur.
            try {
                await reader.cancel();
            } catch {}

            throw error;

        } finally {

            reader.releaseLock();
        }
    }

    // ==========================================
    // 9. AFFICHAGE FLUIDE DU STREAMING
    // ==========================================

    function startSmoothDisplay(element) {

        stopSmoothDisplay();

        displayQueue = "";

        displayTimer = setInterval(() => {

            if (displayQueue.length === 0) return;

            const speed = displayQueue.length > 40 ? 4 : 2;

            const fragment = displayQueue.slice(0, speed);

            displayQueue = displayQueue.slice(speed);

            element.textContent += fragment;

            scrollToBottom();

        }, 20);
    }

    function stopSmoothDisplay() {

        if (displayTimer) {

            clearInterval(displayTimer);

            displayTimer = null;
        }

        displayQueue = "";
    }

    async function waitForDisplayCompletion() {

        while (displayQueue.length > 0) {

            await new Promise(resolve => setTimeout(resolve, 20));
        }

        stopSmoothDisplay();
    }

    // ==========================================
    // 10. ACTION : PRÉREMPLIR LE CONTACT
    // ==========================================

    function addContactAction(contactMessage, shouldSave = true) {

        if (
            typeof contactMessage !== "string" ||
            !contactMessage.trim()
        ) {
            return;
        }

        const button = document.createElement("button");

        button.type = "button";

        button.className = "nait-ai-contact-action";

        button.dataset.contactMessage = contactMessage;

        button.textContent =
            "Préremplir le formulaire de contact →";

        button.addEventListener("click", () => {

            const contactSection =
                document.getElementById("contact");

            const contactField =
                document.getElementById("message");

            // [V4] Page projet : le formulaire est sur l'accueil.
            // On y va, et l'accueil préremplit le champ message.
            if (!contactSection || !contactField) {

                storageSet(CONTACT_PREFILL_KEY, contactMessage);
                storageSet(WINDOW_STATE_KEY, "closed");

                // Évite que le retour à l'ancienne position écrase #contact.
                storageRemove(HOME_SCROLL_KEY);

                window.location.href = BASE + "index.html#contact";

                return;
            }

            contactField.value = contactMessage;

            contactField.dispatchEvent(
                new Event("input", { bubbles: true })
            );

            window.location.hash = "contact";

            contactSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            closeChat();

            setTimeout(() => {

                contactField.focus({
                    preventScroll: true
                });

            }, 500);

        });

        messagesContainer.appendChild(button);

        if (shouldSave) {
            saveConversationDisplay();
        }

        scrollToBottom();

        return button;
    }

    // ==========================================
    // 11. ACTION : VISITER UN PROJET NAIT
    // ==========================================

    function addProjectAction(project, shouldSave = true) {

        // [V4] BASE vaut "../" dans projets/ et "" sur l'accueil.
        const projectFolder = BASE + "projets/";

        const projects = {

            robot: {
                title: "Découvrir le robot domotique",
                url: projectFolder + "robot.html",
                icon: "🤖"
            },

            drone: {
                title: "Découvrir le drone agricole",
                url: projectFolder + "drone.html",
                icon: "🚁"
            },

            iot: {
                title: "Découvrir le projet IoT",
                url: projectFolder + "iot.html",
                icon: "🌐"
            }

        };

        const selectedProject = projects[project];

        if (!selectedProject) return;

        const link = document.createElement("a");

        link.href = selectedProject.url;

        link.className = "nait-ai-project-action";

        link.dataset.project = project;

        link.target = "_self";

        link.textContent =
            selectedProject.icon + " " +
            selectedProject.title + " →";

        messagesContainer.appendChild(link);

        if (shouldSave) {
            saveConversationDisplay();
        }

        scrollToBottom();

        return link;
    }

    // ==========================================
    // 12. MÉMOIRE VISUELLE DE LA CONVERSATION
    // ==========================================

    function saveConversationDisplay() {

        const entries = [];

        for (const element of messagesContainer.children) {

            if (element.classList.contains("nait-ai-typing")) {
                continue;
            }

            if (
                element.classList.contains("nait-ai-message-user")
            ) {

                entries.push({
                    type: "message",
                    role: "user",
                    text: element.textContent
                });

            }

            else if (
                element.classList.contains("nait-ai-message-bot")
            ) {

                // [V4] Ne jamais mémoriser une bulle vide (réponse en cours).
                if (!element.textContent.trim()) continue;

                entries.push({
                    type: "message",
                    role: "bot",
                    text: element.textContent
                });

            }

            else if (
                element.classList.contains("nait-ai-project-action")
            ) {

                entries.push({
                    type: "project",
                    project: element.dataset.project
                });

            }

            else if (
                element.classList.contains("nait-ai-contact-action")
            ) {

                entries.push({
                    type: "contact",
                    message: element.dataset.contactMessage
                });

            }
        }

        // Limiter la taille de l'historique visuel.
        const limitedEntries = entries.slice(-MAX_DISPLAY_ENTRIES);

        storageSet(
            DISPLAY_STORAGE_KEY,
            JSON.stringify(limitedEntries)
        );
    }

    // ==========================================
    // 13. RESTAURATION DE LA CONVERSATION
    // ==========================================

    function restoreConversationDisplay() {

        const saved = storageGet(DISPLAY_STORAGE_KEY);

        // Première visite : conserver le message d'accueil.
        if (!saved) {

            saveConversationDisplay();

            return;
        }

        try {

            const entries = JSON.parse(saved);

            if (!Array.isArray(entries)) {
                throw new Error("Historique visuel invalide.");
            }

            messagesContainer.replaceChildren();

            entries.forEach(entry => {

                if (
                    entry.type === "message" &&
                    typeof entry.text === "string" &&
                    entry.text.trim() && // [V4] ignorer les bulles vides
                    ["user", "bot"].includes(entry.role)
                ) {

                    addMessage(
                        entry.text,
                        entry.role,
                        false
                    );

                }

                else if (
                    entry.type === "project" &&
                    ["robot", "drone", "iot"].includes(entry.project)
                ) {

                    addProjectAction(
                        entry.project,
                        false
                    );

                }

                else if (
                    entry.type === "contact" &&
                    typeof entry.message === "string"
                ) {

                    addContactAction(
                        entry.message,
                        false
                    );

                }

            });

            // [V4] Les suggestions ne servent qu'au début de la conversation.
            if (
                suggestions &&
                entries.some(entry =>
                    entry.type === "message" && entry.role === "user"
                )
            ) {
                suggestions.style.display = "none";
            }

            scrollToBottom();

        } catch (error) {

            console.error(
                "NAIT AI : restauration impossible.",
                error
            );

            storageRemove(DISPLAY_STORAGE_KEY);

            messagesContainer.replaceChildren();

            saveConversationDisplay();
        }
    }

    // ==========================================
    // 14. ENVOI DES MESSAGES
    // ==========================================

    // [V4] replay : renvoie un message dont la réponse a été coupée
    // par un changement de page, sans recréer la bulle du visiteur.
    async function sendMessage(message, { replay = false } = {}) {

        const cleanMessage = String(message || "").trim();

        if (!cleanMessage || isLoading) return;

        // Afficher le message du visiteur.
        if (!replay) {
            addMessage(cleanMessage, "user");
        }

        input.value = "";
        storageRemove(DRAFT_STORAGE_KEY); // [V4]

        if (suggestions) {
            suggestions.style.display = "none";
        }

        // [V4] Si l'utilisateur change de page avant la fin de la réponse,
        // ce message sera renvoyé automatiquement sur la page suivante.
        storageSet(PENDING_STORAGE_KEY, cleanMessage);

        setLoading(true);

        const typing = showTyping();

        let assistantBubble = null;

        let contactMessageToPrefill = null;

        let projectToVisit = null;

        try {

            const response = await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream"
                },

                body: JSON.stringify({

                    sessionId: sessionId,

                    message: cleanMessage,

                    history: conversationHistory

                })

            });

            if (!response.ok) {

                let errorMessage =
                    "Erreur du serveur NAIT AI.";

                try {

                    const data = await response.json();

                    errorMessage = data.error || errorMessage;

                } catch {}

                throw new Error(errorMessage);
            }

            removeTyping(typing);

            assistantBubble = addMessage("", "bot");

            startSmoothDisplay(assistantBubble);

            const assistantMessage = await readClaudeStream(

                response,

                fragment => {
                    displayQueue += fragment;
                },

                contactMessage => {
                    contactMessageToPrefill = contactMessage;
                },

                project => {
                    projectToVisit = project;
                }

            );

            // Attendre l'affichage de tous les caractères.
            await waitForDisplayCompletion();

            if (!assistantMessage.trim()) {

                assistantBubble.remove();

                assistantBubble = null;

                throw new Error("Réponse vide de Claude.");
            }

            // Ajouter les actions après la réponse.
            if (contactMessageToPrefill) {

                addContactAction(contactMessageToPrefill);
            }

            if (projectToVisit) {

                addProjectAction(projectToVisit);
            }

            // Mettre à jour l'historique conversationnel.
            conversationHistory.push(

                {
                    role: "user",
                    content: cleanMessage
                },

                {
                    role: "assistant",
                    content: assistantMessage
                }

            );

            // Limiter le nombre de messages conservés.
            if (conversationHistory.length > MAX_HISTORY) {

                conversationHistory.splice(
                    0,
                    conversationHistory.length - MAX_HISTORY
                );
            }

            saveConversationHistory();

            saveConversationDisplay();

        } catch (error) {

            // [V4] Le flux a été coupé par un changement de page :
            // rien à afficher, le message sera rejoué sur la page suivante.
            if (isLeaving) return;

            stopSmoothDisplay();

            removeTyping(typing);

            console.error("NAIT AI V4 :", error);

            if (assistantBubble) {
                assistantBubble.remove();
            }

            addMessage(

                "Je rencontre momentanément un problème de connexion. " +
                "Veuillez réessayer dans quelques instants.",

                "bot"

            );

        } finally {

            stopSmoothDisplay();

            removeTyping(typing);

            setLoading(false);

            // [V4] Le message n'est plus « en attente » sauf si on quitte la page.
            if (!isLeaving) {

                storageRemove(PENDING_STORAGE_KEY);

                if (isOpen) {
                    input.focus();
                }
            }
        }
    }

    // ==========================================
    // 15. FORMULAIRE DE CONVERSATION
    // ==========================================

    form.addEventListener("submit", event => {

        event.preventDefault();

        sendMessage(input.value);
    });

    // ==========================================
    // 16. SUGGESTIONS AUTOMATIQUES
    // ==========================================

    document.querySelectorAll(
        "#nait-ai-suggestions [data-message]"
    ).forEach(button => {

        button.addEventListener("click", () => {

            const message = button.dataset.message;

            if (message) {
                sendMessage(message);
            }
        });
    });

    // ==========================================
    // 17. ÉTAT DU BACKEND
    // ==========================================

    // [V4.2] Dernier état connu mémorisé : le texte d'en-tête ne change plus
    // (« Assistant technologique » → « En ligne ») à chaque page.
    const STATUS_STORAGE_KEY = "nait_ai_status";

    function setStatus(text, online) {

        statusText.textContent = text;

        statusText.classList.toggle("nait-ai-online", online);

        storageSet(
            STATUS_STORAGE_KEY,
            JSON.stringify({ text, online })
        );
    }

    async function checkBackendStatus() {

        if (!statusText) return;

        try {

            const cached = JSON.parse(
                storageGet(STATUS_STORAGE_KEY) || "null"
            );

            if (cached && typeof cached.text === "string") {

                statusText.textContent = cached.text;

                statusText.classList.toggle(
                    "nait-ai-online",
                    Boolean(cached.online)
                );
            }

        } catch {}

        try {

            const response = await fetch(STATUS_URL);

            if (!response.ok) {
                throw new Error("Backend indisponible.");
            }

            const data = await response.json();

            if (data.status === "online") {
                setStatus("En ligne · Assistant IA", true);
            } else {
                setStatus("Service indisponible", false);
            }

        } catch (error) {

            setStatus("Connexion indisponible", false);

            console.warn(
                "NAIT AI : backend inaccessible.",
                error
            );
        }
    }

    // ==========================================
    // 18. INITIALISATION
    // ==========================================

    // [V4.1] Recharge tout l'état partagé depuis sessionStorage.
    // Utilisée au chargement ET au retour depuis le cache du navigateur.
    function applySavedState() {

        // [V4.2] Pas d'animation pendant la restauration.
        widget.classList.add("nait-ai-restoring");
        clearTimeout(restoringTimer);
        restoringTimer = setTimeout(() => {
            widget.classList.remove("nait-ai-restoring");
        }, 1500);

        // 1. Historique envoyé à Claude (même tableau, contenu remplacé)
        conversationHistory.splice(
            0,
            conversationHistory.length,
            ...loadConversationHistory()
        );

        // 2. Messages affichés
        restoreConversationDisplay();

        // 3. Brouillon de saisie
        input.value = storageGet(DRAFT_STORAGE_KEY) || "";

        // 4. État ouvert/fermé et position de lecture
        if (storageGet(WINDOW_STATE_KEY) === "open") {

            openChat({ focus: false, keepScroll: true });

            const savedScroll = storageGet(SCROLL_STORAGE_KEY);

            if (savedScroll !== null && Number.isFinite(Number(savedScroll))) {
                scrollMessagesTo(Number(savedScroll));
            } else {
                scrollToBottom();
            }

        } else {

            closeChat();
        }
    }

    applySavedState();

    // [V4] Venu d'une page projet via « Préremplir le formulaire de contact ».
    const contactPrefill = storageGet(CONTACT_PREFILL_KEY);
    const contactFieldOnThisPage = document.getElementById("message");

    if (contactPrefill && contactFieldOnThisPage) {

        contactFieldOnThisPage.value = contactPrefill;

        contactFieldOnThisPage.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        storageRemove(CONTACT_PREFILL_KEY);
    }

    // [V4] Rejouer un message dont la réponse a été coupée par la navigation.
    const pendingMessage = storageGet(PENDING_STORAGE_KEY);

    if (pendingMessage) {

        storageRemove(PENDING_STORAGE_KEY);

        sendMessage(pendingMessage, { replay: true });
    }

    // Vérifier le backend.
    checkBackendStatus();

    console.log(
        "NAIT AI V4 — Widget persistant initialisé."
    );
}

// [V4] Lancement immédiat (script placé en fin de <body>),
// sans attendre DOMContentLoaded : le widget est prêt avant le premier affichage.
if (document.body) {
    initNaitAI();
} else {
    document.addEventListener("DOMContentLoaded", initNaitAI);
}