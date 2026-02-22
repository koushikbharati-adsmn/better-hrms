import express from "express";
import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import * as cheerio from "cheerio";
import cors from "cors";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "*",
  }),
);

const baseURL = "https://hrms.adsmn.in";

async function submitTimesheets({ email, password, data }) {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    }),
  );

  // 1️⃣ Load login page
  const loginPage = await client.get(`${baseURL}/login`);
  const $login = cheerio.load(loginPage.data);
  const csrfToken = $login('input[name="_token"]').val();
  if (!csrfToken) throw new Error("CSRF token not found");

  // 2️⃣ Login
  const loginResp = await client.post(
    `${baseURL}/login`,
    new URLSearchParams({ _token: csrfToken, email, password }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${baseURL}/login`,
        Origin: baseURL,
      },
      validateStatus: (s) => s < 500,
    },
  );

  if (![204, 302].includes(loginResp.status))
    throw new Error("Invalid credentials");

  // 3️⃣ Load workentryactivities page to get staff_id & submit CSRF
  const page = await client.get(`${baseURL}/backend/workentryactivities`);
  const $ = cheerio.load(page.data);

  const submitToken =
    $('meta[name="csrf-token"]').attr("content") ||
    $('input[name="_token"]').val();
  const staffId = $('input[name="staff_id"]').val();

  if (!submitToken || !staffId)
    throw new Error("Could not extract required fields");

  console.log("✅ Logged in, submitting", data.length, "data...");

  // 4️⃣ Submit all data concurrently
  const requests = data.map((proj) =>
    client.post(
      `${baseURL}/backend/store-project`,
      new URLSearchParams({
        _token: submitToken,
        ...proj,
        staff_id: staffId,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: `${baseURL}/backend/workentryactivities`,
          Origin: baseURL,
        },
        validateStatus: (s) => s < 500,
      },
    ),
  );

  const results = await Promise.allSettled(requests);

  return results.map((r, i) => ({
    data: data[i],
    success: r.status === "fulfilled" && [200, 204].includes(r.value.status),
    status: r.status === "fulfilled" ? r.value.status : null,
    error: r.status === "rejected" ? r.reason.message : null,
  }));
}

app.post("/submit-timesheet", async (req, res) => {
  try {
    const { email, password, data } = req.body;
    if (!email || !password || !Array.isArray(data) || !data.length) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const result = await submitTimesheets({ email, password, data });
    res.json({ success: true, results: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.listen(3000, () => console.log("🚀 API running on port 3000"));
