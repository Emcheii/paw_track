# PawFood
### Sales Analysis, Inventory Management, and Demand Forecasting System

PawFood is a web-based demand forecasting system designed to help businesses make better inventory and purchasing decisions. It analyzes historical sales data and uses machine learning to predict future product demand, helping reduce inventory shortages and unnecessary stock accumulation.

---

## Overview

Managing product inventory requires understanding how much stock may be needed in the future. Relying only on manual estimates can lead to overstocking, stock shortages, and inefficient purchasing decisions.

PawFood addresses this by combining sales analysis, inventory management, and machine learning-based demand forecasting in one platform.

The system processes historical sales records to identify demand patterns and generate forecasts that support more informed inventory planning.

## Key Features

### 1. Inventory Management
- Manage product information and inventory records.
- Monitor available stock quantities.
- Keep track of inventory changes.
- Support better stock management decisions.

### 2. Sales Management and Analysis
- Record and manage sales transactions.
- Review historical sales information.
- Analyze product sales performance.
- Use sales history as input for demand forecasting.

### 3. Demand Forecasting
- Process historical sales data.
- Apply machine learning to forecast future product demand.
- Generate product demand predictions.
- Provide insights to support inventory planning.

### 4. Reports and Analytics
- View sales and inventory-related reports.
- Review forecasting results.
- Use historical and predicted demand to support business decisions.

### 5. User and Profile Management
- Manage system user accounts.
- Maintain user profile information.
- Support controlled access to system features.

---

## Technology Stack

| Component | Technology |
|---|---|
| Backend | Node.js |
| Machine Learning | Python |
| Data Processing | Python data science libraries |
| Dataset | Excel (.xlsx) |
| Frontend | Project web interface |
| Database | Project-configured database |

*Refer to the project configuration files for the exact package and dependency versions.*

## Project Structure

```text
paw_track/
│
├── public/                  # Frontend assets and pages
│
├── src/
│   ├── routes/              # Application API routes
│   │   ├── health.routes.js
│   │   ├── product.routes.js
│   │   ├── profile.routes.js
│   │   └── reports.routes.js
│   │
│   ├── scripts/             # Utility and setup scripts
│   │   └── create-admin.js
│   │
│   └── services/            # Application business logic
│       ├── forecast.service.js
│       └── ml.service.js
│
├── machine_learning/        # Machine learning components
│   ├── data/                # Historical sales dataset
│   └── .venv/               # Python virtual environment
│
├── .env                     # Environment configuration
├── .gitignore
├── package.json
└── README.md
```

*The structure above highlights the main project components. Additional files and folders may exist in the repository.*

## How Demand Forecasting Works

The forecasting workflow follows these general stages:

1. **Historical Data Collection**  
   The system uses historical sales records as the source of forecasting data.

2. **Data Preparation**  
   Sales data is prepared and processed for machine learning.

3. **Machine Learning Processing**  
   The forecasting service communicates with the machine learning component to generate predictions.

4. **Demand Prediction**  
   The model analyzes historical demand patterns and estimates future product demand.

5. **Inventory Planning**  
   Forecasting results help users make informed decisions about stock replenishment and purchasing.

## Installation and Setup

### Prerequisites

Before running PawFood, make sure you have:

- Node.js and npm
- Python 3
- Git
- A configured database
- The required project environment variables

### 1. Clone the Repository

```bash
git clone https://github.com/Emcheii/paw_track.git
cd paw_track
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root and configure the required database connection and application settings.

Do not upload your actual `.env` file to GitHub.

### 4. Set Up the Python Environment

Navigate to the machine learning directory:

```bash
cd machine_learning
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Install the required Python dependencies using the project's dependency file, if provided.

### 5. Run the Application

Return to the project root:

```bash
cd ..
```

Start the application using the appropriate script defined in `package.json`.

---

## Dataset

PawFood uses historical sales records as the primary source of information for demand forecasting.

The original dataset is maintained separately from the public repository when it contains private or restricted business information.

For reproducibility, a sanitized sample dataset can be provided when appropriate.

## Security and Data Privacy

- Environment variables and credentials should not be committed.
- Private business datasets should remain outside the public repository.
- User access should be controlled through the application's authentication and authorization mechanisms.
- Database credentials must be stored securely.

## Project Purpose

PawFood aims to demonstrate how machine learning can be integrated into a business application to support demand forecasting and inventory planning.

By transforming historical sales records into useful demand predictions, the system helps businesses make more informed decisions about inventory and future purchasing needs.

## Author

**Emcheii**

GitHub: [@Emcheii](https://github.com/Emcheii)

## License

No license has been specified yet. All rights are reserved unless a license is added to this repository.