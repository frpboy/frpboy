/**
 * Independent daily watchdog for the GitHub profile contribution updater.
 * Vercel Cron dispatches the GitHub workflow only when README snapshot is stale.
 */
const OWNER = "frpboy";
const REPO = "frpboy";
const WORKFLOW = "external-contributions.yml";
const BRANCH = "main";
const README_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/README.md`;
const DISPATCH_URL = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`;

function indiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
function snapshotDate(readme) {
  const match = readme.match(/SELECTED-CONTRIBUTIONS-REFRESH-DATE:START -->(\d{1,2}) ([A-Za-z]+) (\d{4})<!-- SELECTED-CONTRIBUTIONS-REFRESH-DATE:END/);
  if (!match) throw new Error("Profile snapshot date markers are missing from README.md.");
  const months = {January:"01",February:"02",March:"03",April:"04",May:"05",June:"06",July:"07",August:"08",September:"09",October:"10",November:"11",December:"12"};
  if (!months[match[2]]) throw new Error("Unknown month in profile snapshot date.");
  return `${match[3]}-${months[match[2]]}-${String(match[1]).padStart(2,"0")}`;
}
module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ok:false,error:"Method not allowed"});
  const cronSecret = process.env.CRON_SECRET;
  const githubToken = process.env.PROFILE_DISPATCH_TOKEN;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ok:false,error:"Unauthorized"});
  if (!githubToken) return res.status(503).json({ok:false,error:"PROFILE_DISPATCH_TOKEN is not configured"});
  try {
    const today = indiaDate();
    const readmeResponse = await fetch(README_URL, {headers:{"Cache-Control":"no-cache"}});
    if (!readmeResponse.ok) throw new Error(`Unable to read README: HTTP ${readmeResponse.status}`);
    const currentSnapshot = snapshotDate(await readmeResponse.text());
    if (currentSnapshot >= today) return res.status(200).json({ok:true,action:"skipped",reason:"Snapshot already current",today,snapshot:currentSnapshot});
    const dispatch = await fetch(DISPATCH_URL, {
      method:"POST",
      headers:{Accept:"application/vnd.github+json",Authorization:`Bearer ${githubToken}`,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},
      body:JSON.stringify({ref:BRANCH}),
    });
    if (dispatch.status !== 204) throw new Error(`GitHub dispatch failed: HTTP ${dispatch.status} ${(await dispatch.text()).slice(0,500)}`);
    return res.status(202).json({ok:true,action:"dispatched",today,previousSnapshot:currentSnapshot,workflow:WORKFLOW});
  } catch (error) {
    console.error("Profile watchdog failed:",error);
    return res.status(500).json({ok:false,error:error.message});
  }
};
