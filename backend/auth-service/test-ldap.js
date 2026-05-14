import { Client } from 'ldapts';

async function testBind() {
  const url = process.env.LDAP_URL || 'ldap://10.16.200.221:389';
  const user = process.env.TEST_LDAP_USER || 'claudio.navarro';
  const pass = process.env.TEST_LDAP_PASS || 'Junaeb26_02';

  console.log('LDAP URL:', url);
  console.log('Usuario prueba:', user);

  const client = new Client({ url });
  try {
    await client.bind(`${user}@${process.env.LDAP_DOMAIN || 'junaeb.local'}`, pass);
    console.log('Bind OK (UPN)');
  } catch (e) {
    console.error('Bind UPN falló:', e.message || e);
  } finally {
    try { await client.unbind(); } catch(_) {}
  }
}

testBind().catch(err => {
  console.error('Error en test-ldap:', err);
});
