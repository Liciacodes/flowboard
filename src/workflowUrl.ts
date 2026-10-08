const SHORT_ID_LENGTH = 8;
const MAX_SLUG_LENGTH = 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, "");

export const getWorkflowPath = (workflow: { id: string; name: string }) => {
  const slug = slugify(workflow.name);
  const shortId = workflow.id.slice(0, SHORT_ID_LENGTH);

  return `/workflows/${slug ? `${slug}-${shortId}` : shortId}`;
};

// Reads the short id back out of "customer-onboarding-8b1f6c1e". Older links
// that hold a full workflow id still work.
export const getWorkflowKey = (param: string) => {
  if (UUID_PATTERN.test(param)) {
    return param.slice(0, SHORT_ID_LENGTH).toLowerCase();
  }

  return param.slice(param.lastIndexOf("-") + 1).toLowerCase();
};

export const isSameWorkflowPath = (pathA: string, pathB: string) => {
  const prefix = "/workflows/";

  if (!pathA.startsWith(prefix) || !pathB.startsWith(prefix)) {
    return false;
  }

  return (
    getWorkflowKey(pathA.slice(prefix.length)) ===
    getWorkflowKey(pathB.slice(prefix.length))
  );
};
