
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "../..");

const PYTHON_PATH = path.join(
    projectRoot,
    "machine_learning",
    ".venv",
    "Scripts",
    "python.exe"
);

const PREDICT_SCRIPT = path.join(
    projectRoot,
    "machine_learning",
    "pipeline",
    "predict.py"
);

const NUMERICAL_FEATURES = [
    "lag1",
    "lag2",
    "lag3",
    "roll3",
    "roll6",
    "roll12",
    "month_sin",
    "month_cos",
    "trend"
];

function validateFeatures(features) {
    for (const key of [...NUMERICAL_FEATURES, "sub"]) {
        if (features[key] === undefined || features[key] === null) {
            throw new Error(`Missing prediction feature: ${key}`);
        }
    }

    for (const key of NUMERICAL_FEATURES) {
        if (!Number.isFinite(Number(features[key]))) {
            throw new Error(`Invalid numeric feature: ${key}`);
        }
    }

    if (
        typeof features.sub !== "string" ||
        !features.sub.trim()
    ) {
        throw new Error("A valid subcategory is required.");
    }
}

function predictDemands(featuresList) {
    if (!Array.isArray(featuresList) || featuresList.length === 0) {
        return Promise.reject(
            new Error("A non-empty prediction batch is required.")
        );
    }

    try {
        featuresList.forEach(validateFeatures);
    } catch (error) {
        return Promise.reject(error);
    }

    const input = JSON.stringify(
        featuresList.map(features => ({
            ...Object.fromEntries(
                NUMERICAL_FEATURES.map(key => [
                    key,
                    Number(features[key])
                ])
            ),
            sub: features.sub.trim().toUpperCase()
        }))
    );

    return new Promise((resolve, reject) => {
        const child = spawn(
            PYTHON_PATH,
            [PREDICT_SCRIPT],
            { windowsHide: true }
        );

        let stdout = "";
        let stderr = "";
        let settled = false;

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");

        child.stdout.on("data", chunk => {
            stdout += chunk;
        });

        child.stderr.on("data", chunk => {
            stderr += chunk;
        });

        child.on("error", error => {
            if (settled) return;
            settled = true;
            reject(error);
        });

        child.on("close", code => {
            if (settled) return;
            settled = true;

            if (stderr.trim()) {
                console.warn("Python warning:", stderr.trim());
            }

            let result;

            try {
                result = JSON.parse(stdout.trim());
            } catch {
                reject(
                    new Error(
                        `Invalid Python response (exit ${code}): ${
                            stderr.trim() || stdout.trim() || "No output"
                        }`
                    )
                );
                return;
            }

            if (code !== 0 || result?.error) {
                reject(new Error(
                    result?.error || `Python process exited with code ${code}.`
                ));
                return;
            }

            if (!Array.isArray(result) || result.length !== featuresList.length) {
                reject(new Error("Python returned an unexpected prediction batch."));
                return;
            }

            resolve(result);
        });

        child.stdin.on("error", error => {
            if (error.code !== "EPIPE") {
                console.error("Python input error:", error);
            }
        });

        child.stdin.end(input);
    });
}

// Backward-compatible single prediction.
async function predictDemand(features) {
    const results = await predictDemands([features]);
    return results[0];
}

async function predictCategoryDemand(features) {
    return predictDemand(features);
}

module.exports = {
    predictDemand,
    predictCategoryDemand,
    predictDemands
};
