import axios from "axios";

const url = "https://hrms.adsmn.in/backend/store-project";

const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  Cookie:
    "XSRF-TOKEN=eyJpdiI6Ikc0Yi9tOTVQT1dmYkR4bG8ra3VIbkE9PSIsInZhbHVlIjoidmFaOE9uUElaWlhpTDdmWnBvdGtxUDk2eXJzNmNtcndkeExyeTFkZ2FQSGhzZHBtUW5mMFAyRytpazRFSndtaGZPVUsvOWNwdGpsU1BZcUpXcm5SREw2VWZieHBzbGtSWkdkZ3IxMVVDV3V3M2phQzBjejg2Y3NQVVJ6d1pQaVMiLCJtYWMiOiIxOTg5YmZjM2NjM2E0MzI1NTQzZjA0MDQ1MzNhNWZjZTdjZTVlMWVjZWFlYmVkZjE0Y2UyNDhhOTQxNDBhN2FkIiwidGFnIjoiIn0%3D; hrmsadsmn_session=eyJpdiI6IjYvQS82N2JMZFM0bXJiUERzZmxFbXc9PSIsInZhbHVlIjoibHJmaGJXdi9HNFVaVWljQWRHb2RlS1pSOWszY3VHb0dYcmhBQlpkaFF0anJpa0xONFdVQ3RvdWhkZlIwcW1FNk5UZHVmaUgrazFiVHVpaThXb0d5WGVvejc5cWZYd0ZlWGR4RWJhRHF0c1lsU1RLOGF5eTBtOFZIMVpJemEvTEEiLCJtYWMiOiI5YTBhZDc2ZDE4MTlhZTc1NzVhMDM3ZDE4ZDQwZjdlYzVjMDUxMzUxZTU4NWIyNzI5ZDFiNGY5OWFiYzlkZTFmIiwidGFnIjoiIn0%3D",
};

const projects = [
  {
    project_manager_id: 53,
    project_id: 86,
    start_date: "19-02-2026",
    total_hours: 6,
    task: "SQS for SOAP APIs & dashboard add ons",
    staff_id: 91,
  },
];

async function storeProjects() {
  const requests = projects.map((project) => {
    const data = new URLSearchParams({
      _token: "EfDo1l2k7x9JisxyFR1Vrvfw5FaFlfv95ZLhFN5f",
      ...project,
    });

    return axios.post(url, data.toString(), { headers });
  });

  try {
    const responses = await Promise.all(requests);
    console.log("All inserted:", responses.length);
  } catch (error) {
    console.error("One of the requests failed");
  }
}

storeProjects();
