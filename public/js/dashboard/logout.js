document.addEventListener("DOMContentLoaded", () => {
    const logoutButtons = document.querySelectorAll(".logout-btn");

    logoutButtons.forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.preventDefault();

            try {
                const response = await fetch("/logout", {
                    method: "POST"
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error("Logout error:", result.detail);
                    return;
                }

                window.location.href = "/";

            } catch (error) {
                console.error("Logout request failed:", error);
            }
        });
    });
});