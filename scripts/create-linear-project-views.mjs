/**
 * Creates project-attached Linear issue views for Epics / Stories / Todos.
 *
 * Usage:
 *   LINEAR_API_KEY=lin_api_... node scripts/create-linear-project-views.mjs
 *
 * Optional:
 *   LINEAR_PROJECT_ID=<uuid>   # defaults to Kubera
 *   LINEAR_TEAM_ID=<uuid>      # defaults to Cobble Inc
 *
 * Create a key: Linear → Settings → Account → Security & access → Personal API keys
 */
import { writeFileSync } from "node:fs";

const API = "https://api.linear.app/graphql";
const DEFAULT_PROJECT_ID = "ee3c0924-bf6f-457d-b5f5-591fe3770f00"; // Kubera
const DEFAULT_TEAM_ID = "03b87f8a-69a4-4620-8de2-dfd23b0c14a5"; // Cobble Inc

const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
  console.error("Missing LINEAR_API_KEY. Create a personal API key in Linear settings.");
  process.exit(1);
}

const projectId = process.env.LINEAR_PROJECT_ID || DEFAULT_PROJECT_ID;
const teamId = process.env.LINEAR_TEAM_ID || DEFAULT_TEAM_ID;

async function gql(query, variables) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors?.length) {
    const msg = json.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(msg);
  }
  return json.data;
}

const views = [
  {
    name: "Epics",
    description: "Top-level epic issues in this project (no parent).",
    color: "#5E6AD2",
    icon: "Layers",
    filterData: {
      and: [
        { project: { id: { eq: projectId } } },
        { parent: { null: true } },
      ],
    },
  },
  {
    name: "Stories",
    description: "Story sub-issues under epics in this project.",
    color: "#26B5CE",
    icon: "BookOpen",
    filterData: {
      and: [
        { project: { id: { eq: projectId } } },
        { parent: { null: false } },
      ],
    },
  },
  {
    name: "Active stories (todos live here)",
    description:
      "Non-completed stories. Checklist todos live inside each story description until promoted to issues.",
    color: "#95A2B3",
    icon: "CheckSquare",
    filterData: {
      and: [
        { project: { id: { eq: projectId } } },
        { parent: { null: false } },
        { state: { type: { nin: ["completed", "canceled"] } } },
      ],
    },
  },
];

const mutation = `
  mutation CreateView($input: CustomViewCreateInput!) {
    customViewCreate(input: $input) {
      success
      customView {
        id
        name
        url
        slugId
      }
    }
  }
`;

const created = [];
for (const view of views) {
  const data = await gql(mutation, {
    input: {
      name: view.name,
      description: view.description,
      color: view.color,
      icon: view.icon,
      shared: true,
      projectId,
      teamId,
      filterData: view.filterData,
    },
  });
  const cv = data.customViewCreate.customView;
  created.push(cv);
  console.log(`✓ ${cv.name}: ${cv.url || cv.id}`);
}

const summaryPath = new URL("../.linear-views.json", import.meta.url);
writeFileSync(summaryPath, JSON.stringify({ projectId, teamId, created }, null, 2) + "\n");
console.log(`\nWrote ${summaryPath.pathname}`);
console.log("Open the Kubera project — views appear as tabs next to Overview / Issues.");
