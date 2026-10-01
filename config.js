/* Configuración compartida del sitio (formulario de contacto y CRM).
   Pega aquí los datos de tu proyecto de Supabase: Project Settings → API.
   La "anon public key" es pública a propósito: la base de datos solo deja al visitante CREAR contactos (ver crm/supabase.sql).
   Mientras SUPABASE_URL esté vacío, el formulario envía los datos por WhatsApp. */
window.NELOMUX = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  WHATSAPP: '584246759019',
  WHATSAPP_LABEL: '+58 424 675 9019',
  EMAIL: 'info@nelomux.com'
};
