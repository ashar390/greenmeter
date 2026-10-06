export type RequestUser = {
  email: string;
  displayName: string;
};

const EMAIL_HEADER = "oai-authenticated-user-email";
const NAME_HEADER = "oai-authenticated-user-full-name";
const NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";

export function getRequestUser(request: Request): RequestUser | null {
  const email = request.headers.get(EMAIL_HEADER)?.trim().toLowerCase();
  if (!email) return null;

  const encodedName = request.headers.get(NAME_HEADER);
  const displayName = encodedName && request.headers.get(NAME_ENCODING_HEADER) === "percent-encoded-utf-8"
    ? safelyDecode(encodedName) ?? email
    : email;

  return { email, displayName };
}

function safelyDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
