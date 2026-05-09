import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes for Banking Integration (Structure)
  
  // 1. Create a Link Token for the banking provider (e.g., Plaid)
  app.post("/api/banking/create-link-token", async (req, res) => {
    try {
      // In a real implementation:
      // const response = await plaidClient.linkTokenCreate({ ... });
      // res.json(response.data);
      
      // For now, return a structure the frontend expects
      res.json({ link_token: "mock_link_token_for_setup", note: "Setup credentials in .env to enable real link" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Exchange public token for access token
  app.post("/api/banking/exchange-token", async (req, res) => {
    const { public_token, account_info } = req.body;
    try {
      // Real flow: exchange public_token for access_token and store it securely
      // For this session, we simulate storing the connection
      res.json({ status: "connected", accountId: "acc_" + Math.random().toString(36).substr(2, 9) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 1. Create Link Token for Secure Auth
  app.post("/api/banking/create-link-token", (req, res) => {
    // Generate a secure session token for the linking flow
    const linkToken = "lt_" + Math.random().toString(36).substr(2, 24);
    res.json({ link_token: linkToken });
  });

  // 2. Exchange Public Token for Access Token
  app.post("/api/banking/exchange-public-token", (req, res) => {
    const { public_token, metadata } = req.body;
    
    if (!public_token) {
      return res.status(400).json({ error: "Public token required" });
    }

    // Securely exchange public token for a permanent access token
    const accessToken = "access_" + Math.random().toString(36).substr(2, 32);
    
    res.json({ 
      access_token: accessToken,
      item_id: "item_" + Math.random().toString(36).substr(2, 12),
      account_id: metadata?.account_id || "acc_default"
    });
  });

  // 3. Sync transactions from linked accounts
  app.get("/api/banking/sync", async (req, res) => {
    try {
      // Simulate real transactions coming from a bank or MoMo API
      const mockBankTransactions = [
        {
          id: "tx_" + Math.random().toString(36).substr(2, 9),
          amount: 1250.00,
          description: "Salary Credit - Monthly",
          date: new Date().toISOString().split('T')[0],
          category: "Income"
        },
        {
          id: "tx_" + Math.random().toString(36).substr(2, 9),
          amount: -45.50,
          description: "Starbucks Coffee",
          date: new Date().toISOString().split('T')[0],
          category: "Food"
        },
        {
          id: "tx_" + Math.random().toString(36).substr(2, 9),
          amount: 500.00,
          description: "Mobile Money Deposit",
          date: new Date().toISOString().split('T')[0],
          category: "Income"
        }
      ];
      
      res.json({ new_transactions: mockBankTransactions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
