const allowedMethods = new Set(["GET", "POST", "OPTIONS"]);

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (!allowedMethods.has(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ detail: "Method not allowed" }),
    };
  }

  const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
  if (!backendUrl) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        detail: "BACKEND_URL is not configured in Netlify environment variables.",
      }),
    };
  }

  const path = event.queryStringParameters?.path || "/";
  const query = new URLSearchParams(event.queryStringParameters || {});
  query.delete("path");
  const queryString = query.toString();
  const targetUrl = `${backendUrl}${path.startsWith("/") ? path : `/${path}`}${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        "Content-Type": event.headers["content-type"] || "application/json",
      },
      body: event.httpMethod === "GET" ? undefined : event.body,
    });

    return {
      statusCode: response.status,
      headers: {
        ...headers,
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
      body: await response.text(),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        detail: "Unable to reach backend API.",
        message: error.message,
      }),
    };
  }
};
