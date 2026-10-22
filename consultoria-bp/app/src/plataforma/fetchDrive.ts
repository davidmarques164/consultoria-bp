/** fetch usado nas chamadas ao Google Drive. No celular é o fetch normal; no Windows, `fetchDrive.web.ts`. */
export const fetchDrive: typeof fetch = (input, init) => fetch(input, init)
