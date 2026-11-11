
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const togglePasswordBtn = document.getElementById("togglePassword");
    const eyeIcon = document.getElementById("eyeIcon");
    const requestAccountBtn = document.getElementById("requestAccountBtn");

    requestAccountBtn?.addEventListener("click", async (event) => {
        event.preventDefault();

        await Swal.fire({
            icon: "info",
            title: "Account Registration Unavailable",
            text: "User accounts are created by the administrator. Please contact the admin to request an account.",
            confirmButtonText: "OK",
            confirmButtonColor: "#204e33"
        });
    });

    togglePasswordBtn.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        if (isPassword) {
            eyeIcon.classList.remove("fa-eye");
            eyeIcon.classList.add("fa-eye-slash");
        } else {
            eyeIcon.classList.remove("fa-eye-slash");
            eyeIcon.classList.add("fa-eye");
        }
    });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const login = loginInput.value.trim();
        const password = passwordInput.value;

        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    login,
                    password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                await Swal.fire({
                    icon: "error",
                    title: "Login Failed",
                    text: result.detail || "Unable to log in."
                });

                return;
            }

            await Swal.fire({
                icon: "success",
                title: "Login Successful",
                text: "Welcome back!",
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false
            });

            const destination = result.user?.role === "admin"
                ? "/pages/admin/overview.html"
                : "/pages/dashboard/overview.html";

            window.location.href = destination;

        } catch (error) {
            console.error("Login error:", error);

            await Swal.fire({
                icon: "error",
                title: "Connection Error",
                text: "Unable to connect to the server."
            });
        }
    });
});
