import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import * as cheerio from "cheerio";

const baseURL = "https://hrms.adsmn.in";

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

async function login() {
  console.log("🔐 Loading login page...");

  const loginPage = await client.get(`${baseURL}/login`);

  const $ = cheerio.load(loginPage.data);
  const csrfToken = $('input[name="_token"]').val();

  if (!csrfToken) {
    throw new Error("CSRF token not found in login page");
  }

  console.log("✅ CSRF token extracted");

  const response = await client.post(
    `${baseURL}/login`,
    new URLSearchParams({
      _token: csrfToken,
      email: "koushik.b@adsmn.in",
      password: "adsmn@123",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${baseURL}/login`,
        Origin: baseURL,
      },
      validateStatus: (s) => s < 500,
    },
  );

  if (response.status === 204 || response.status === 302) {
    console.log("✅ Login successful");
  } else {
    throw new Error(`Login failed with status ${response.status}`);
  }
}

async function storeProject() {
  console.log("📄 Loading workentryactivities page...");

  const page = await client.get(`${baseURL}/backend/workentryactivities`);

  const $ = cheerio.load(page.data);

  // ✅ Extract CSRF token
  const csrfToken =
    $('meta[name="csrf-token"]').attr("content") ||
    $('input[name="_token"]').val();

  if (!csrfToken) {
    throw new Error("CSRF token not found");
  }

  // ✅ Extract dynamic staff_id
  const staffId = $('input[name="staff_id"]').val();

  if (!staffId) {
    throw new Error("staff_id not found");
  }

  console.log("✅ Detected staff_id:", staffId);

  // ✅ Submit project
  const response = await client.post(
    `${baseURL}/backend/store-project`,
    new URLSearchParams({
      _token: csrfToken,
      project_manager_id: 53,
      project_id: 123,
      start_date: "22-02-2026",
      total_hours: 1,
      task: "Testing",
      staff_id: staffId, // 🔥 dynamic
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${baseURL}/backend/workentryactivities`,
        Origin: baseURL,
      },
      validateStatus: (s) => s < 500,
    },
  );

  console.log("Store project status:", response.status);

  if (response.status === 200 || response.status === 204) {
    console.log("✅ Project stored successfully");
  } else {
    console.log("⚠️ Unexpected response:", response.data);
  }
}
async function run() {
  try {
    await login();
    await storeProject();
    console.log("🎉 Done");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

run();
