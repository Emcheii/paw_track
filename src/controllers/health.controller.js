function healthCheck(req, res) {
    res.json({
        status: "ok",
        message: "Paw Track API is running"
    });
}

module.exports = {
    healthCheck
};