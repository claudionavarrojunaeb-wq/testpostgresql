import { Client } from "ldapts";

// =======================
// 🔑 CONFIG DESDE .env
// =======================

// Variables esperadas en .env:
// LDAP_URL, LDAP_DOMAIN, LDAP_BASE_DN, LDAP_BIND_DN (opcional), LDAP_BIND_PASSWORD (opcional)

// =======================
// 🔐 AUTHENTICATE (robusto)
// =======================
export async function authenticate(username, password) {
  const LDAP_URL = process.env.LDAP_URL;
  const LDAP_DOMAIN = process.env.LDAP_DOMAIN;
  const LDAP_BASE_DN = process.env.LDAP_BASE_DN;
  const LDAP_BIND_DN = process.env.LDAP_BIND_DN;
  const LDAP_BIND_PASSWORD = process.env.LDAP_BIND_PASSWORD;

  console.log("LDAP URL:", LDAP_URL);

  const client = new Client({ url: LDAP_URL });

  // 1) Intento con UPN: username@DOMAIN
  const upn = `${username}@${LDAP_DOMAIN}`;
  console.log("Intentando bind con UPN:", upn);
  try {
    await client.bind(upn, password);
    console.log("✅ BIND OK (UPN)");
    return { success: true, message: "Login LDAP exitoso (UPN)" };
  } catch (errUpn) {
    console.warn("UPN bind falló:", errUpn.message || errUpn);
  }

  // 2) Intento con DOMAIN\\username
  const domainPrefix = LDAP_DOMAIN ? LDAP_DOMAIN.split('.')[0].toUpperCase() : undefined;
  if (domainPrefix) {
    const domainUser = `${domainPrefix}\\${username}`;
    console.log("Intentando bind con DOMAIN\\user:", domainUser);
    try {
      await client.bind(domainUser, password);
      console.log("✅ BIND OK (DOMAIN\\user)");
      return { success: true, message: "Login LDAP exitoso (DOMAIN\\user)" };
    } catch (errDomainUser) {
      console.warn("DOMAIN\\user bind falló:", errDomainUser.message || errDomainUser);
    }
  }

  // 3) Intento: resolver DN via búsqueda y luego bind con DN
  try {
    // Usar cuenta de servicio si está configurada
    if (LDAP_BIND_DN && LDAP_BIND_PASSWORD) {
      console.log('Usando cuenta de servicio para búsqueda:', LDAP_BIND_DN);
      await client.bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD);
    } else {
      console.log('Intentando búsqueda anónima para resolver DN del usuario');
      try {
        await client.bind();
      } catch (e) {
        console.warn('Bind anónimo no soportado o falló:', e.message || e);
      }
    }

    if (!LDAP_BASE_DN) {
      console.warn('LDAP_BASE_DN no definido; no puedo buscar DN de usuario');
      throw new Error('LDAP_BASE_DN no configurado');
    }

    const filter = `(sAMAccountName=${username})`;
    console.log('Buscando usuario con filtro:', filter, 'en', LDAP_BASE_DN);

    const { searchEntries } = await client.search(LDAP_BASE_DN, {
      scope: 'sub',
      filter,
      sizeLimit: 1,
    });

    if (!searchEntries || searchEntries.length === 0) {
      console.warn('Usuario no encontrado por búsqueda LDAP');
      throw new Error('Usuario no encontrado');
    }

    const userEntry = searchEntries[0];
    const userDN = userEntry.dn || userEntry.raw?.dn;
    console.log('DN encontrado:', userDN);

    try {
      await client.bind(userDN, password);
      console.log('✅ BIND OK (DN encontrado)');
      return { success: true, message: 'Login LDAP exitoso (DN)' };
    } catch (errBindDN) {
      console.warn('Bind con DN encontrado falló:', errBindDN.message || errBindDN);
      throw new Error('Credenciales inválidas');
    }

  } catch (errSearch) {
    console.error('Error durante búsqueda/bind LDAP:', errSearch.message || errSearch);
    throw new Error('Error LDAP: ' + (errSearch.message || errSearch));
  } finally {
    try {
      await client.unbind();
    } catch (e) {
      console.warn('Error al unbind:', e.message || e);
    }
  }

}
