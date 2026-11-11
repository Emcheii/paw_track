document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("pawfood_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const lightCard = document.querySelector(".theme-card:nth-child(1)");
    const darkCard = document.querySelector(".theme-card:nth-child(2)");

    if (lightCard && darkCard) {
        const lightRadio = lightCard.querySelector(".radio-check");
        const darkRadio = darkCard.querySelector(".radio-check");

        function updateThemeUI(theme) {
            if (theme === "dark") {
                darkCard.classList.add("active");
                lightCard.classList.remove("active");
                
                if (darkRadio) {
                    darkRadio.classList.add("active");
                    darkRadio.innerHTML = '<i class="fa-solid fa-check"></i>';
                }
                if (lightRadio) {
                    lightRadio.classList.remove("active");
                    lightRadio.innerHTML = '';
                }
            } else {
                lightCard.classList.add("active");
                darkCard.classList.remove("active");
                
                if (lightRadio) {
                    lightRadio.classList.add("active");
                    lightRadio.innerHTML = '<i class="fa-solid fa-check"></i>';
                }
                if (darkRadio) {
                    darkRadio.classList.remove("active");
                    darkRadio.innerHTML = '';
                }
            }
        }

        // Initialize UI state on load
        updateThemeUI(savedTheme);

        // Light Mode Click Handler
        lightCard.addEventListener("click", () => {
            document.documentElement.setAttribute("data-theme", "light");
            localStorage.setItem("pawfood_theme", "light");
            updateThemeUI("light");
        });

        // Dark Mode Click Handler
        darkCard.addEventListener("click", () => {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("pawfood_theme", "dark");
            updateThemeUI("dark");
        });
    }
});